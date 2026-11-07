package com.tgdownloader.app.data.remote

import com.tgdownloader.app.data.model.FileMetadataDto
import com.tgdownloader.app.data.model.ResolveRequestDto
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Streaming
import retrofit2.http.Url

interface TelegramApiService {

    @POST("api/resolve")
    suspend fun resolveMediaLink(
        @Body request: ResolveRequestDto
    ): Response<FileMetadataDto>

    @Streaming
    @GET
    suspend fun streamFile(
        @Url fileUrl: String,
        @Header("Range") rangeHeader: String? = null
    ): Response<ResponseBody>
}
