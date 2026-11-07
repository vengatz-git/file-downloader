package com.tgdownloader.app.domain.model

sealed interface DownloadProgress {
    data object Idle : DownloadProgress
    
    data class Downloading(
        val bytesDownloaded: Long,
        val totalBytes: Long,
        val progressPercentage: Float,
        val speedBytesPerSec: Long
    ) : DownloadProgress {
        val formattedSpeed: String
            get() {
                val speedKb = speedBytesPerSec / 1024.0
                return if (speedKb > 1024) {
                    String.format("%.2f MB/s", speedKb / 1024.0)
                } else {
                    String.format("%.1f KB/s", speedKb)
                }
            }
    }

    data class Success(val destinationPath: String) : DownloadProgress
    data class Error(val message: String) : DownloadProgress
}
