package com.tgdownloader.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tgdownloader.app.data.remote.NetworkModule
import com.tgdownloader.app.data.repository.TelegramRepositoryImpl
import com.tgdownloader.app.domain.model.DownloadProgress
import com.tgdownloader.app.domain.repository.TelegramRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.File

class MainViewModel(
    private var repository: TelegramRepository = TelegramRepositoryImpl(NetworkModule.getApiService())
) : ViewModel() {

    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    private var downloadJob: Job? = null

    fun onLinkChanged(newLink: String) {
        _uiState.update { it.copy(linkInput = newLink, errorMessage = null) }
    }

    fun onBackendUrlChanged(newUrl: String) {
        _uiState.update { it.copy(backendUrlInput = newUrl) }
        repository = TelegramRepositoryImpl(NetworkModule.getApiService(newUrl))
    }

    fun resolveLink() {
        val link = _uiState.value.linkInput.trim()
        if (link.isEmpty()) {
            _uiState.update { it.copy(errorMessage = "Please enter a valid Telegram link") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isResolving = true, errorMessage = null, resolvedMetadata = null) }

            val result = repository.resolveMediaLink(link)
            result.fold(
                onSuccess = { metadata ->
                    _uiState.update {
                        it.copy(
                            isResolving = false,
                            resolvedMetadata = metadata,
                            downloadProgress = DownloadProgress.Idle
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isResolving = false,
                            errorMessage = error.localizedMessage ?: "Failed to resolve link"
                        )
                    }
                }
            )
        }
    }

    fun startDownload(storageDirectory: File) {
        val metadata = _uiState.value.resolvedMetadata ?: return

        downloadJob?.cancel()
        downloadJob = viewModelScope.launch {
            if (!storageDirectory.exists()) {
                storageDirectory.mkdirs()
            }
            val destinationFile = File(storageDirectory, metadata.fileName)

            repository.downloadFileStream(metadata.downloadUrl, destinationFile)
                .collect { progress ->
                    _uiState.update { it.copy(downloadProgress = progress) }
                }
        }
    }

    fun cancelDownload() {
        downloadJob?.cancel()
        downloadJob = null
        _uiState.update { it.copy(downloadProgress = DownloadProgress.Idle) }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
