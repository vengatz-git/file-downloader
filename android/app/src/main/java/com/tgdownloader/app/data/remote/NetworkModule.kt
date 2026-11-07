package com.tgdownloader.app.data.remote

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NetworkModule {

    private var currentBaseUrl = "http://10.0.2.2:8000/"

    private val loggingInterceptor by lazy {
        HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
    }

    val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .addInterceptor(loggingInterceptor)
            .build()
    }

    private var retrofitInstance: Retrofit? = null
    private var apiServiceInstance: TelegramApiService? = null

    fun getApiService(baseUrl: String = currentBaseUrl): TelegramApiService {
        val sanitized = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        if (apiServiceInstance == null || currentBaseUrl != sanitized) {
            currentBaseUrl = sanitized
            retrofitInstance = Retrofit.Builder()
                .baseUrl(currentBaseUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            apiServiceInstance = retrofitInstance!!.create(TelegramApiService::class.java)
        }
        return apiServiceInstance!!
    }
}
