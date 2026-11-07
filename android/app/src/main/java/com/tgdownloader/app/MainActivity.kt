package com.tgdownloader.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import com.tgdownloader.app.ui.screen.MainScreen
import com.tgdownloader.app.ui.theme.TgDownloaderTheme
import com.tgdownloader.app.ui.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TgDownloaderTheme {
                MainScreen(viewModel = viewModel)
            }
        }
    }
}
