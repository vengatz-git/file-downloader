package com.tgdownloader.app.data.repository

import com.tgdownloader.app.data.model.ResolveRequestDto
import com.tgdownloader.app.data.remote.TelegramApiService
import com.tgdownloader.app.domain.model.DownloadProgress
import com.tgdownloader.app.domain.model.FileMetadata
import com.tgdownloader.app.domain.repository.TelegramRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

class TelegramRepositoryImpl(
    private val apiService: TelegramApiService
) : TelegramRepository {

    override suspend fun resolveMediaLink(link: String): Result<FileMetadata> {
        return try {
            val response = apiService.resolveMediaLink(ResolveRequestDto(link = link))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.toDomain())
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Server error ${response.code()}"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun downloadFileStream(downloadUrl: String, destinationFile: File): Flow<DownloadProgress> = flow {
        emit(DownloadProgress.Idle)

        val existingBytes = if (destinationFile.exists()) destinationFile.length() else 0L
        val rangeHeader = if (existingBytes > 0) "bytes=$existingBytes-" else null

        val response = try {
            apiService.streamFile(downloadUrl, rangeHeader)
        } catch (e: Exception) {
            emit(DownloadProgress.Error("Network error: ${e.localizedMessage ?: "Unknown"}"))
            return@flow
        }

        if (!response.isSuccessful || response.body() == null) {
            emit(DownloadProgress.Error("Download failed with HTTP ${response.code()}"))
            return@flow
        }

        val body = response.body()!!
        val contentLength = body.contentLength()
        val totalBytes = if (contentLength > 0) existingBytes + contentLength else -1L

        var inputStream: InputStream? = null
        var outputStream: FileOutputStream? = null

        try {
            inputStream = body.byteStream()
            // Append if we resumed, overwrite otherwise
            outputStream = FileOutputStream(destinationFile, existingBytes > 0)

            val buffer = ByteArray(64 * 1024) // 64 KB buffer
            var bytesDownloaded = existingBytes
            var lastEmittedTime = System.currentTimeMillis()
            var bytesSinceLastEmission = 0L

            var bytesRead: Int
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                outputStream.write(buffer, 0, bytesRead)
                bytesDownloaded += bytesRead
                bytesSinceLastEmission += bytesRead

                val currentTime = System.currentTimeMillis()
                val elapsedTime = currentTime - lastEmittedTime

                if (elapsedTime >= 250 || bytesDownloaded == totalBytes) { // Emit every 250ms
                    val speed = if (elapsedTime > 0) (bytesSinceLastEmission * 1000) / elapsedTime else 0L
                    val percentage = if (totalBytes > 0) (bytesDownloaded.toFloat() / totalBytes) * 100f else 0f

                    emit(
                        DownloadProgress.Downloading(
                            bytesDownloaded = bytesDownloaded,
                            totalBytes = totalBytes,
                            progressPercentage = percentage,
                            speedBytesPerSec = speed
                        )
                    )

                    lastEmittedTime = currentTime
                    bytesSinceLastEmission = 0L
                }
            }

            outputStream.flush()
            emit(DownloadProgress.Success(destinationFile.absolutePath))

        } catch (e: Exception) {
            emit(DownloadProgress.Error("IO error while streaming: ${e.localizedMessage ?: "Unknown"}"))
        } finally {
            try {
                inputStream?.close()
                outputStream?.close()
            } catch (_: Exception) {}
        }
    }.flowOn(Dispatchers.IO)
}
