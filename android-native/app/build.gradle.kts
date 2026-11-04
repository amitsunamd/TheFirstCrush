plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android {
    namespace = "com.amitpariyar.thefirstcrush"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.amitpariyar.thefirstcrush"
        minSdk = 23
        targetSdk = 35
        versionCode = 5
        versionName = "5.0.0"
    }
    buildFeatures { compose = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.15" }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.09.00"))
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
