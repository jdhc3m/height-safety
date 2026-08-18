plugins {
    id("org.jetbrains.kotlin.jvm")
}

group = "au.com.heightsafety"
version = "0.0.0"

kotlin {
    jvmToolchain(21)
}

dependencies {
    testImplementation(kotlin("test"))
    testImplementation("junit:junit:4.13.2")
}

tasks.test {
    useJUnit()
}
