package com.tgdownloader.app.data.model

import com.google.gson.annotations.SerializedName
import com.tgdownloader.app.domain.model.FileMetadata

data class FileMetadataDto(
    @SerializedName("chat_id")
    val chatId: Long,
    @SerializedName("message_id")
    val messageId: Int,
    @SerializedName("file_name")
    val fileName: String,
    @SerializedName("file_size")
    val fileSize: Long,
    @SerializedName("mime_type")
    val mimeType: String,
    @SerializedName("download_url")
    val downloadUrl: String,
    @SerializedName("caption")
    val caption: String? = null
) {
    fun toDomain(): FileMetadata {
        return FileMetadata(
            chatId = chatId,
            messageId = messageId,
            fileName = fileName,
            fileSize = fileSize,
            mimeType = mimeType,
            downloadUrl = downloadUrl,
            caption = caption
        )
    }
}
