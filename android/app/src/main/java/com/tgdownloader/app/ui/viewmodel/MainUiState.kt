package com.tgdownloader.app.ui.viewmodel

import com.tgdownloader.app.domain.model.DownloadProgress
import com.tgdownloader.app.domain.model.FileMetadata

data class MainUiState(
    val linkInput: String = "",
    val backendUrlInput: String = "http://10.0.2.2:8000/",
    val isResolving: Boolean = false,
    val resolvedMetadata: FileMetadata? = null,
    val downloadProgress: DownloadProgress = DownloadProgress.Idle,
    val errorMessage: String? = null
)
