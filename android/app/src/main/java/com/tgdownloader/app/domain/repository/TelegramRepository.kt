package com.tgdownloader.app.domain.repository

import com.tgdownloader.app.domain.model.DownloadProgress
import com.tgdownloader.app.domain.model.FileMetadata
import kotlinx.coroutines.flow.Flow
import java.io.File

interface TelegramRepository {
    suspend fun resolveMediaLink(link: String): Result<FileMetadata>
    fun downloadFileStream(downloadUrl: String, destinationFile: File): Flow<DownloadProgress>
}
