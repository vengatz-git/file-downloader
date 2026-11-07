package com.tgdownloader.app.domain.model

data class FileMetadata(
    val chatId: Long,
    val messageId: Int,
    val fileName: String,
    val fileSize: Long,
    val mimeType: String,
    val downloadUrl: String,
    val caption: String? = null
) {
    val formattedSize: String
        get() {
            if (fileSize <= 0) return "0 B"
            val units = arrayOf("B", "KB", "MB", "GB", "TB")
            val digitGroups = (Math.log10(fileSize.toDouble()) / Math.log10(1024.0)).toInt()
            val value = fileSize / Math.pow(1024.0, digitGroups.toDouble())
            return String.format("%.2f %s", value, units[digitGroups])
        }
}
