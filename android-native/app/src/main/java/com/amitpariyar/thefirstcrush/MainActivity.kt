package com.amitpariyar.thefirstcrush

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.io.OutputStreamWriter
import java.util.concurrent.Executors

private const val SB_URL = "https://udwnmeqhwpnmwknjtssq.supabase.co"
private const val SB_KEY = "sb_publishable_7NgXp6OxMzUITMkzAf18Dw_sd-7_61x"
private val Blue = Color(0xFF1877F2)
private val Page = Color(0xFFF0F2F5)
private val Ink = Color(0xFF1C1E21)
private val worker = Executors.newSingleThreadExecutor()

private data class FeedPost(val id: String, val userId: String, val text: String, val name: String, val created: String)

private object Backend {
    fun request(path: String, method: String = "GET", token: String? = null, body: String? = null, prefer: String? = null): String {
        val c = (URL("$SB_URL/$path").openConnection() as HttpURLConnection)
        c.requestMethod = method
        c.connectTimeout = 15000
        c.readTimeout = 15000
        c.setRequestProperty("apikey", SB_KEY)
        c.setRequestProperty("Authorization", "Bearer ${token ?: SB_KEY}")
        c.setRequestProperty("Content-Type", "application/json")
        c.setRequestProperty("Accept", "application/json")
        if (prefer != null) c.setRequestProperty("Prefer", prefer)
        if (body != null) {
            c.doOutput = true
            OutputStreamWriter(c.outputStream, Charsets.UTF_8).use { it.write(body) }
        }
        val code = c.responseCode
        val stream = if (code in 200..299) c.inputStream else c.errorStream
        val result = stream?.bufferedReader()?.use { it.readText() } ?: ""
        c.disconnect()
        if (code !in 200..299) throw IllegalStateException(parseError(result, "Server error ($code)"))
        return result
    }

    fun signIn(email: String, password: String) = JSONObject(request("auth/v1/token?grant_type=password", "POST", body = JSONObject().put("email", email).put("password", password).toString()))
    fun signUp(email: String, password: String, firstName: String, lastName: String, dob: String, gender: String, phone: String) = JSONObject(request("auth/v1/signup", "POST", body = JSONObject().put("email", email).put("password", password).put("data", JSONObject().put("first_name", firstName).put("last_name", lastName).put("full_name", "$firstName $lastName".trim()).put("date_of_birth", dob).put("gender", gender).put("phone", phone.takeIf { it.isNotBlank() } ?: "")).toString()))
    fun posts(token: String): List<FeedPost> {
        val arr = JSONArray(request("rest/v1/posts?select=*&order=created_at.desc&limit=50", token = token))
        return (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            FeedPost(o.optString("id"), o.optString("user_id", o.optString("author_id")), o.optString("body", o.optString("text", o.optString("content"))), o.optString("author_name", "The First Crush member"), o.optString("created_at"))
        }
    }
    fun createPost(token: String, userId: String, text: String, authorName: String) {
        val safeName = authorName.trim().ifBlank { "The First Crush member" }
        val body = JSONObject().put("user_id", userId).put("author_name", safeName).put("category", "General").put("language", "mixed").put("body", text).put("text", text)
        request("rest/v1/posts", "POST", token, body.toString(), "return=minimal")
    }
    fun toggleLike(token: String, userId: String, postId: String) {
        val pid = URLEncoder.encode(postId, "UTF-8")
        val uid = URLEncoder.encode(userId, "UTF-8")
        val existing = JSONArray(request("rest/v1/likes?select=post_id&post_id=eq.$pid&user_id=eq.$uid", token = token))
        if (existing.length() > 0) request("rest/v1/likes?post_id=eq.$pid&user_id=eq.$uid", "DELETE", token, prefer = "return=minimal")
        else request("rest/v1/likes", "POST", token, JSONObject().put("post_id", postId).put("user_id", userId).toString(), "return=minimal")
    }
    fun addComment(token: String, userId: String, postId: String, body: String) {
        request("rest/v1/comments", "POST", token, JSONObject().put("post_id", postId).put("user_id", userId).put("body", body).toString(), "return=minimal")
    }
    fun sharePost(token: String, userId: String, postId: String) {
        request("rest/v1/post_shares", "POST", token, JSONObject().put("post_id", postId).put("user_id", userId).toString(), "return=minimal,resolution=ignore-duplicates")
    }
    fun profile(token: String, userId: String): String {
        val safe = URLEncoder.encode(userId, "UTF-8")
        val arr = JSONArray(request("rest/v1/profiles?select=*&id=eq.$safe&limit=1", token = token))
        return if (arr.length() > 0) arr.getJSONObject(0).optString("full_name", arr.getJSONObject(0).optString("username", "Your profile")) else "Your profile"
    }
    private fun parseError(s: String, fallback: String): String = try {
        val o = JSONObject(s)
        o.optString("msg", o.optString("message", o.optString("error_description", fallback)))
    } catch (_: Exception) { fallback }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { FirstCrushApp(this) }
    }
}

@Composable
private fun FirstCrushApp(context: Context) {
    val prefs = remember { context.getSharedPreferences("tfc_session", Context.MODE_PRIVATE) }
    var token by remember { mutableStateOf(prefs.getString("access_token", null)) }
    var userId by remember { mutableStateOf(prefs.getString("user_id", null) ?: "") }
    var email by remember { mutableStateOf(prefs.getString("email", null) ?: "") }
    var page by remember { mutableStateOf("Home") }
    var authMode by remember { mutableStateOf("Login") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var authEmail by remember { mutableStateOf("") }
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var dateOfBirth by remember { mutableStateOf("") }
    var gender by remember { mutableStateOf("Prefer not to say") }
    var phone by remember { mutableStateOf("") }
    var authBusy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var draft by remember { mutableStateOf("") }
    var posts by remember { mutableStateOf(listOf<FeedPost>()) }
    var profileName by remember { mutableStateOf("Your profile") }
    var refresh by remember { mutableIntStateOf(0) }
    val tabs = listOf("Home", "Friends", "Post", "Messages", "Alerts", "Profile")
    val icons = listOf(Icons.Default.Home, Icons.Default.People, Icons.Default.AddCircle, Icons.Default.Chat, Icons.Default.Notifications, Icons.Default.Person)

    LaunchedEffect(token, refresh) {
        if (token != null) {
            busy = true
            try {
                posts = Backend.posts(token!!)
                profileName = Backend.profile(token!!, userId)
                message = ""
            } catch (e: Exception) { message = e.message ?: "Could not connect. Check internet and retry." }
            busy = false
        }
    }

    MaterialTheme(colorScheme = lightColorScheme(primary = Blue, background = Page, surface = Color.White)) {
        if (token == null) {
            AuthScreen(authMode, { authMode = it; message = "" }, authEmail, { authEmail = it }, firstName, { firstName = it }, lastName, { lastName = it }, dateOfBirth, { dateOfBirth = it }, gender, { gender = it }, phone, { phone = it }, password, { password = it }, showPassword, { showPassword = it }, authBusy, message, {
                if (authEmail.isBlank() || !authEmail.contains("@") || password.length < 6 || (authMode != "Login" && (firstName.isBlank() || lastName.isBlank() || dateOfBirth.isBlank()))) {
                    message = if (authMode == "Login") "Valid email ra kamtima 6 characters ko password halnuhos." else "First name, surname, date of birth, valid email ra 6+ character password bharnuhos."
                } else {
                    authBusy = true; message = ""
                    worker.execute {
                        try {
                            val result = if (authMode == "Login") Backend.signIn(authEmail.trim(), password) else Backend.signUp(authEmail.trim(), password, firstName.trim(), lastName.trim(), dateOfBirth.trim(), gender, phone.trim())
                            val access = result.optString("access_token")
                            val uid = result.optJSONObject("user")?.optString("id") ?: ""
                            if (access.isBlank()) {
                                runOnUi(context) { message = "Account request successful. Email verification required bhaye inbox check garnuhos."; authBusy = false }
                            } else {
                                prefs.edit().putString("access_token", access).putString("user_id", uid).putString("email", authEmail.trim()).apply()
                                runOnUi(context) { token = access; userId = uid; email = authEmail.trim(); authBusy = false; page = "Home" }
                            }
                        } catch (e: Exception) { runOnUi(context) { message = e.message ?: "Login failed"; authBusy = false } }
                    }
                }
            })
        } else {
            Scaffold(
                containerColor = Page,
                topBar = {
                    Row(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("♥", color = Color(0xFFE53950), fontSize = 30.sp)
                        Spacer(Modifier.width(8.dp))
                        Text("The First Crush", color = Ink, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
                        IconButton(onClick = { page = "Search" }) { Icon(Icons.Default.Search, "Search", tint = Ink) }
                        IconButton(onClick = { page = "Alerts" }) { Icon(Icons.Default.Notifications, "Notifications", tint = Ink) }
                    }
                },
                bottomBar = {
                    NavigationBar(containerColor = Color.White) {
                        tabs.forEachIndexed { i, tab ->
                            NavigationBarItem(selected = page == tab, onClick = { if (tab == "Post") page = "Create post" else page = tab }, icon = { Icon(icons[i], tab) }, label = { Text(tab, fontSize = 9.sp, maxLines = 1) })
                        }
                    }
                }
            ) { pad ->
                when (page) {
                    "Home" -> HomeFeed(Modifier.padding(pad), posts, profileName, { page = "Create post" }, { refresh++ }, { postId -> worker.execute { try { Backend.toggleLike(token!!, userId, postId); runOnUi(context) { refresh++ } } catch (e: Exception) { runOnUi(context) { message = e.message ?: "Like failed" } } } }, { postId, comment -> worker.execute { try { Backend.addComment(token!!, userId, postId, comment); runOnUi(context) { message = "Comment added"; refresh++ } } catch (e: Exception) { runOnUi(context) { message = e.message ?: "Comment failed" } } } }, { postId -> worker.execute { try { Backend.sharePost(token!!, userId, postId); runOnUi(context) { message = "Post shared"; refresh++ } } catch (e: Exception) { runOnUi(context) { message = e.message ?: "Share failed" } } } })
                    "Create post" -> CreatePost(Modifier.padding(pad), draft, { draft = it }, busy, message, {
                        if (draft.isNotBlank()) {
                            busy = true; message = ""
                            worker.execute {
                                try { Backend.createPost(token!!, userId, draft.trim(), profileName.ifBlank { email.substringBefore("@") }); runOnUi(context) { draft = ""; page = "Home"; busy = false; refresh++ } }
                                catch (e: Exception) { runOnUi(context) { message = e.message ?: "Post failed"; busy = false } }
                            }
                        }
                    })
                    "Profile" -> ProfilePage(Modifier.padding(pad), profileName, email) {
                        prefs.edit().remove("access_token").remove("user_id").remove("email").apply()
                        token = null; userId = ""; email = ""; password = ""; authEmail = ""
                    }
                    "Friends" -> FeaturePage(Modifier.padding(pad), "Friends", listOf("Friend requests", "People you may know", "Your friends"), "Friends ko live list ko lagi connections table ko columns/RLS confirm garnu parcha.")
                    "Messages" -> FeaturePage(Modifier.padding(pad), "Messages", listOf("Private conversations", "Photo / video / file sharing", "Voice messages", "Sent / Seen receipts"), "Messenger UI ready garna baki cha; yo screen le ajhai chat send gardaina.")
                    "Alerts" -> FeaturePage(Modifier.padding(pad), "Notifications", listOf("Likes and comments", "Friend requests", "Story reactions"), "Live notifications backend ajhai connect garna baki cha.")
                    "Search" -> FeaturePage(Modifier.padding(pad), "Search", listOf("Search people", "Search posts"), "Search endpoint ajhai connect garna baki cha.")
                    else -> HomeFeed(Modifier.padding(pad), posts, profileName, { page = "Create post" }, { refresh++ }, { postId -> worker.execute { try { Backend.toggleLike(token!!, userId, postId); runOnUi(context) { refresh++ } } catch (e: Exception) { runOnUi(context) { message = e.message ?: "Like failed" } } } }, { postId, comment -> worker.execute { try { Backend.addComment(token!!, userId, postId, comment); runOnUi(context) { message = "Comment added"; refresh++ } } catch (e: Exception) { runOnUi(context) { message = e.message ?: "Comment failed" } } } }, { postId -> worker.execute { try { Backend.sharePost(token!!, userId, postId); runOnUi(context) { message = "Post shared"; refresh++ } } catch (e: Exception) { runOnUi(context) { message = e.message ?: "Share failed" } } } })
                }
                if (message.isNotBlank() && page != "Create post") {
                    Surface(Modifier.fillMaxWidth().padding(10.dp), color = Color(0xFFFFF3CD), shape = RoundedCornerShape(10.dp)) { Text(message, Modifier.padding(12.dp), color = Ink, fontSize = 13.sp) }
                }
            }
        }
    }
}

private fun runOnUi(context: Context, action: () -> Unit) {
    if (context is ComponentActivity) context.runOnUiThread(action) else action()
}

@Composable
private fun AuthScreen(mode: String, setMode: (String) -> Unit, email: String, setEmail: (String) -> Unit, firstName: String, setFirstName: (String) -> Unit, lastName: String, setLastName: (String) -> Unit, dob: String, setDob: (String) -> Unit, gender: String, setGender: (String) -> Unit, phone: String, setPhone: (String) -> Unit, password: String, setPassword: (String) -> Unit, showPassword: Boolean, setShowPassword: (Boolean) -> Unit, busy: Boolean, message: String, submit: () -> Unit) {
    Column(Modifier.fillMaxSize().background(Page).padding(24.dp).then(Modifier), verticalArrangement = Arrangement.Center) {
        Text("♥", color = Color(0xFFE53950), fontSize = 52.sp)
        Text("The First Crush", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = Blue)
        Text("Connect with people who matter.", color = Color.Gray, modifier = Modifier.padding(top = 5.dp, bottom = 26.dp))
        Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(18.dp)) {
            Column(Modifier.padding(20.dp).heightIn(max = 620.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(if (mode == "Login") "Welcome back" else "Create your account", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                if (mode != "Login") {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(firstName, setFirstName, modifier = Modifier.weight(1f), label = { Text("First name") }, singleLine = true)
                        OutlinedTextField(lastName, setLastName, modifier = Modifier.weight(1f), label = { Text("Surname") }, singleLine = true)
                    }
                    OutlinedTextField(dob, setDob, modifier = Modifier.fillMaxWidth(), label = { Text("Date of birth (YYYY-MM-DD)") }, placeholder = { Text("2000-01-31") }, singleLine = true)
                    var genderExpanded by remember { mutableStateOf(false) }
                    Box {
                        OutlinedButton(onClick = { genderExpanded = true }, modifier = Modifier.fillMaxWidth()) { Text("Gender: $gender") }
                        DropdownMenu(expanded = genderExpanded, onDismissRequest = { genderExpanded = false }) {
                            listOf("Woman", "Man", "Custom", "Prefer not to say").forEach { option -> DropdownMenuItem(text = { Text(option) }, onClick = { setGender(option); genderExpanded = false }) }
                        }
                    }
                    OutlinedTextField(phone, setPhone, modifier = Modifier.fillMaxWidth(), label = { Text("Mobile number (optional)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), singleLine = true)
                }
                OutlinedTextField(email, setEmail, modifier = Modifier.fillMaxWidth(), label = { Text("Email address") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), singleLine = true)
                OutlinedTextField(password, setPassword, modifier = Modifier.fillMaxWidth(), label = { Text("Password") }, singleLine = true, visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(), trailingIcon = { IconButton(onClick = { setShowPassword(!showPassword) }) { Icon(if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility, "Show or hide password") } })
                if (message.isNotBlank()) Text(message, color = Color(0xFFB3261E), fontSize = 13.sp)
                Button(onClick = submit, enabled = !busy, modifier = Modifier.fillMaxWidth().height(48.dp)) { if (busy) CircularProgressIndicator(Modifier.size(20.dp), color = Color.White) else Text(if (mode == "Login") "Log in" else "Sign up") }
                TextButton(onClick = { setMode(if (mode == "Login") "Sign up" else "Login") }, modifier = Modifier.fillMaxWidth()) { Text(if (mode == "Login") "Create new account" else "Already have an account? Log in") }
                Text(if (mode == "Login") "Use your registered email and password." else "By signing up, your name and profile details will be saved. Email verification may be required.", fontSize = 12.sp, color = Color.Gray)
            }
        }
    }
}

@Composable
private fun HomeFeed(
    modifier: Modifier,
    posts: List<FeedPost>,
    profileName: String,
    onCreate: () -> Unit,
    onRefresh: () -> Unit,
    onLike: (String) -> Unit,
    onComment: (String, String) -> Unit,
    onShare: (String) -> Unit
) {
    var commentPost by remember { mutableStateOf<String?>(null) }
    var commentText by remember { mutableStateOf("") }
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 14.dp)) {
        item {
            Row(Modifier.fillMaxWidth().background(Color.White).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Avatar(profileName.take(1).uppercase(), 44)
                Spacer(Modifier.width(10.dp))
                Surface(color = Page, shape = CircleShape, modifier = Modifier.weight(1f).clickable { onCreate() }) { Text("What's on your mind?", Modifier.padding(14.dp), color = Color.Gray) }
                IconButton(onClick = onCreate) { Icon(Icons.Default.AddAPhoto, "Create post", tint = Blue) }
            }
            Spacer(Modifier.height(8.dp))
            Column(Modifier.fillMaxWidth().background(Color.White).padding(vertical = 12.dp)) {
                Text("Stories", Modifier.padding(horizontal = 14.dp), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Ink)
                Row(Modifier.fillMaxWidth().padding(10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StoryTile("＋", "Add story") { onCreate() }
                    Text("Stories appear when friends publish them.", Modifier.align(Alignment.CenterVertically).padding(8.dp), color = Color.Gray, fontSize = 12.sp)
                }
            }
            Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Feed", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Ink, modifier = Modifier.weight(1f))
                TextButton(onClick = onRefresh) { Text("Refresh") }
            }
        }
        if (posts.isEmpty()) item { Text("No posts yet. Create the first post!", Modifier.padding(20.dp), color = Color.Gray) }
        items(posts) { post ->
            Card(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 5.dp), colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(12.dp)) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) { Avatar(post.name.take(1).uppercase(), 42); Spacer(Modifier.width(10.dp)); Column { Text(post.name, fontWeight = FontWeight.Bold, color = Ink); Text(post.created.take(10).ifBlank { "Recently" }, color = Color.Gray, fontSize = 12.sp) } }
                    Spacer(Modifier.height(14.dp))
                    Text(post.text.ifBlank { "(This post has no text.)" }, color = Ink, fontSize = 16.sp)
                    HorizontalDivider(Modifier.padding(vertical = 12.dp), color = Page)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                        TextButton(onClick = { onLike(post.id) }) { Icon(Icons.Default.FavoriteBorder, null); Spacer(Modifier.width(4.dp)); Text("Like") }
                        TextButton(onClick = { commentPost = post.id; commentText = "" }) { Icon(Icons.Default.ChatBubbleOutline, null); Spacer(Modifier.width(4.dp)); Text("Comment") }
                        TextButton(onClick = { onShare(post.id) }) { Icon(Icons.Default.Share, null); Spacer(Modifier.width(4.dp)); Text("Share") }
                    }
                }
            }
        }
    }
    if (commentPost != null) {
        AlertDialog(
            onDismissRequest = { commentPost = null },
            title = { Text("Write a comment") },
            text = { OutlinedTextField(value = commentText, onValueChange = { commentText = it }, modifier = Modifier.fillMaxWidth(), placeholder = { Text("Write something…") }, minLines = 2) },
            confirmButton = { TextButton(onClick = { val id = commentPost; val body = commentText.trim(); if (id != null && body.isNotEmpty()) onComment(id, body); commentPost = null }) { Text("Send") } },
            dismissButton = { TextButton(onClick = { commentPost = null }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun CreatePost(modifier: Modifier, draft: String, onDraft: (String) -> Unit, busy: Boolean, message: String, submit: () -> Unit) {
    Column(modifier.fillMaxSize().padding(16.dp)) {
        Text("Create post", fontSize = 25.sp, fontWeight = FontWeight.Bold, color = Ink)
        Spacer(Modifier.height(14.dp))
        OutlinedTextField(draft, onDraft, modifier = Modifier.fillMaxWidth().weight(1f), placeholder = { Text("What's on your mind?") }, minLines = 5)
        if (message.isNotBlank()) Text(message, color = Color(0xFFB3261E), modifier = Modifier.padding(vertical = 8.dp))
        Button(onClick = submit, enabled = !busy && draft.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text(if (busy) "Publishing…" else "Publish") }
    }
}

@Composable
private fun ProfilePage(modifier: Modifier, name: String, email: String, logout: () -> Unit) {
    Column(modifier.fillMaxSize().padding(18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.fillMaxWidth().height(130.dp).background(Blue, RoundedCornerShape(14.dp)))
        Spacer(Modifier.height(8.dp))
        Avatar(name.take(1).uppercase(), 76)
        Text(name, fontSize = 23.sp, fontWeight = FontWeight.Bold, color = Ink, modifier = Modifier.padding(top = 8.dp))
        Text(email, color = Color.Gray)
        Text("Posts • Photos • Reels", color = Blue, modifier = Modifier.padding(16.dp))
        Button(onClick = logout, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.Logout, null); Spacer(Modifier.width(8.dp)); Text("Log out") }
    }
}

@Composable
private fun FeaturePage(modifier: Modifier, title: String, features: List<String>, note: String) {
    Column(modifier.fillMaxSize().padding(18.dp)) {
        Text(title, fontSize = 25.sp, fontWeight = FontWeight.Bold, color = Ink)
        Spacer(Modifier.height(12.dp))
        features.forEach { feature -> Card(Modifier.fillMaxWidth().padding(vertical = 5.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) { Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.ChevronRight, null, tint = Blue); Spacer(Modifier.width(8.dp)); Text(feature, color = Ink) } } }
        Spacer(Modifier.height(10.dp))
        Text(note, color = Color.Gray, fontSize = 13.sp)
    }
}

@Composable
private fun StoryTile(symbol: String, label: String, onClick: () -> Unit) {
    Column(Modifier.width(104.dp).height(145.dp).background(Page, RoundedCornerShape(13.dp)).clickable { onClick() }.padding(10.dp), verticalArrangement = Arrangement.SpaceBetween) {
        Box(Modifier.size(38.dp).background(Blue, CircleShape), contentAlignment = Alignment.Center) { Text(symbol, color = Color.White, fontSize = 22.sp) }
        Text(label, color = Ink, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
    }
}

@Composable
private fun Avatar(letter: String, size: Int) {
    Box(Modifier.size(size.dp).background(Color(0xFFE4E6EB), CircleShape), contentAlignment = Alignment.Center) {
        Text(letter.ifBlank { "♥" }, color = Blue, fontWeight = FontWeight.Bold, fontSize = (size / 2).sp)
    }
}
