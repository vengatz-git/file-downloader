package com.tgdownloader.app.data.model

import com.google.gson.annotations.SerializedName

data class ResolveRequestDto(
    @SerializedName("link")
    val link: String
)
