# Telegram File Downloader - Android Client

Modern Android client built with **Jetpack Compose** and **Clean Architecture** for downloading files via the VPS streaming backend.

## Tech Stack & Architecture
- **Architecture**: Clean Architecture (UI -> ViewModel -> Domain Repository -> Data Repository / Remote DataSource)
- **UI**: 100% Jetpack Compose with Material 3 design system
- **Asynchronous & Reactive**: Kotlin Coroutines & Kotlin StateFlow / SharedFlow
- **Networking**: Retrofit 2, OkHttp 4 with custom chunk streaming and HTTP Range resume support
- **Build System**: Gradle Kotlin DSL (`build.gradle.kts`) with Version Catalogs (`libs.versions.toml`)

---

## Directory Layout
```
android/app/src/main/java/com/tgdownloader/app/
├── MainActivity.kt
├── TgDownloaderApplication.kt
├── data/
│   ├── model/
│   │   ├── ResolveRequestDto.kt
│   │   └── FileMetadataDto.kt
│   ├── remote/
│   │   ├── TelegramApiService.kt
│   │   └── NetworkModule.kt
│   └── repository/
│       └── TelegramRepositoryImpl.kt
├── domain/
│   ├── model/
│   │   ├── FileMetadata.kt
│   │   └── DownloadProgress.kt
│   └── repository/
│       └── TelegramRepository.kt
└── ui/
    ├── theme/
    │   ├── Color.kt
    │   ├── Theme.kt
    │   └── Type.kt
    ├── viewmodel/
    │   ├── MainViewModel.kt
    │   └── MainUiState.kt
    └── screen/
        └── MainScreen.kt
```

---

## Setup & Running

### 1. Open in Android Studio
1. Launch **Android Studio** (Hedgehog / Iguana / Jellyfish or newer).
2. Open the `android/` directory as an existing Gradle project.
3. Allow Gradle sync to complete and download dependencies.

### 2. VPS Connection Setting
- When testing on the **Android Emulator**, the app defaults to `http://10.0.2.2:8000/` (which points to your host machine's `localhost:8000`).
- If running on a **physical device** or against a **live VPS**, click the **Settings (gear icon)** in the app header and enter your VPS server address (e.g. `http://192.168.1.50:8000/` or `https://tg-downloader.yourdomain.com/`).

### 3. Build & Run
Select your emulator or target device and click **Run 'app'** (`Shift + F10`).
