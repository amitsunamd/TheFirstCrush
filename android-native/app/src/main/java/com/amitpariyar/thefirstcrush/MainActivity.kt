package com.amitpariyar.thefirstcrush

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Blue = Color(0xFF1877F2)
private val Page = Color(0xFFF0F2F5)
private val Ink = Color(0xFF1C1E21)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { FirstCrushApp() }
    }
}

@Composable
private fun FirstCrushApp() {
    var page by remember { mutableStateOf("Home") }
    var showComposer by remember { mutableStateOf(false) }
    var draft by remember { mutableStateOf("") }
    var posts by remember { mutableStateOf(listOf("Welcome to The First Crush 💙")) }
    var showStory by remember { mutableStateOf(false) }
    var storyName by remember { mutableStateOf("Your story") }
    val tabs = listOf("Home", "Friends", "Post", "Messages", "Alerts", "Profile")
    val icons = listOf(Icons.Default.Home, Icons.Default.People, Icons.Default.AddCircle, Icons.Default.Chat, Icons.Default.Notifications, Icons.Default.Person)
    MaterialTheme(colorScheme = lightColorScheme(primary = Blue, background = Page, surface = Color.White)) {
        Scaffold(
            containerColor = Page,
            topBar = {
                Row(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 16.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("♥", color = Color(0xFFE53950), fontSize = 31.sp)
                    Spacer(Modifier.width(9.dp))
                    Text("The First Crush", color = Ink, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
                    IconButton(onClick = { page = "Search" }) { Icon(Icons.Default.Search, "Search", tint = Ink) }
                    IconButton(onClick = { page = "Friends" }) { Icon(Icons.Default.People, "Friends", tint = Ink) }
                }
            },
            bottomBar = {
                NavigationBar(containerColor = Color.White) {
                    tabs.forEachIndexed { i, tab ->
                        NavigationBarItem(
                            selected = page == tab,
                            onClick = { if (tab == "Post") showComposer = true else page = tab },
                            icon = { Icon(icons[i], contentDescription = tab) },
                            label = { Text(tab, fontSize = 10.sp) }
                        )
                    }
                }
            }
        ) { pad ->
            when (page) {
                "Home" -> HomeFeed(Modifier.padding(pad), posts, onStory = { storyName = it; showStory = true }, onCreate = { showComposer = true })
                "Friends" -> SimplePage(Modifier.padding(pad), "Friends", "Friend requests • Suggestions • Your friends")
                "Messages" -> SimplePage(Modifier.padding(pad), "Messages", "Your conversations will appear here")
                "Alerts" -> SimplePage(Modifier.padding(pad), "Notifications", "Likes • Comments • Friend requests")
                "Profile" -> SimplePage(Modifier.padding(pad), "Your profile", "Profile photo • Cover photo • Posts • Photos • Reels")
                else -> SimplePage(Modifier.padding(pad), page, "Search people and posts")
            }
        }
        if (showComposer) AlertDialog(
            onDismissRequest = { showComposer = false },
            title = { Text("Create a post") },
            text = { OutlinedTextField(draft, { draft = it }, placeholder = { Text("What's on your mind?") }, minLines = 3) },
            confirmButton = { TextButton(onClick = { if (draft.isNotBlank()) posts = listOf(draft) + posts; draft = ""; showComposer = false }) { Text("Post") } },
            dismissButton = { TextButton(onClick = { showComposer = false }) { Text("Cancel") } }
        )
        if (showStory) AlertDialog(
            onDismissRequest = { showStory = false },
            title = { Text(storyName) },
            text = { Text("Story viewer • Photos and videos will display here when connected to your account.") },
            confirmButton = { TextButton(onClick = { showStory = false }) { Text("Close") } }
        )
    }
}

@Composable
private fun HomeFeed(modifier: Modifier, posts: List<String>, onStory: (String) -> Unit, onCreate: () -> Unit) {
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 14.dp)) {
        item {
            Row(Modifier.fillMaxWidth().background(Color.White).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Avatar("A", 48)
                Spacer(Modifier.width(10.dp))
                Surface(color = Page, shape = CircleShape, modifier = Modifier.weight(1f).clickable { onCreate() }) {
                    Text("What's on your mind?", Modifier.padding(15.dp), color = Color.Gray)
                }
                TextButton(onClick = onCreate) { Text("Photo") }
            }
            Spacer(Modifier.height(8.dp))
            Column(Modifier.fillMaxWidth().background(Color.White).padding(vertical = 12.dp)) {
                Text("Stories", Modifier.padding(horizontal = 14.dp), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Ink)
                Row(Modifier.fillMaxWidth().padding(10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StoryTile("＋", "Add story", onClick = { onStory("Create story") })
                    StoryTile("A", "Your story", onClick = { onStory("Your story") })
                    StoryTile("♥", "Friends", onClick = { onStory("Friends' stories") })
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Posts", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Ink, modifier = Modifier.weight(1f))
                Text("For you", color = Blue, fontWeight = FontWeight.SemiBold)
            }
        }
        items(posts) { post ->
            Card(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 5.dp), colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(12.dp)) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) { Avatar("A", 42); Spacer(Modifier.width(10.dp)); Column { Text("AMIT", fontWeight = FontWeight.Bold, color = Ink); Text("@amit · Just now", color = Color.Gray, fontSize = 12.sp) } }
                    Spacer(Modifier.height(14.dp))
                    Text(post, color = Ink, fontSize = 16.sp)
                    HorizontalDivider(Modifier.padding(vertical = 12.dp), color = Page)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                        Text("♡ Like", color = Color.Gray)
                        Text("Comment", color = Color.Gray)
                        Text("Share", color = Color.Gray)
                    }
                }
            }
        }
    }
}

@Composable
private fun StoryTile(symbol: String, label: String, onClick: () -> Unit) {
    Column(Modifier.width(104.dp).height(150.dp).background(Page, RoundedCornerShape(13.dp)).clickable { onClick() }.padding(10.dp), verticalArrangement = Arrangement.SpaceBetween) {
        Box(Modifier.size(38.dp).background(Blue, CircleShape), contentAlignment = Alignment.Center) { Text(symbol, color = Color.White, fontSize = 22.sp) }
        Text(label, color = Ink, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
    }
}

@Composable
private fun Avatar(letter: String, size: Int) {
    Box(Modifier.size(size.dp).background(Color(0xFFE4E6EB), CircleShape), contentAlignment = Alignment.Center) {
        Text(letter, color = Blue, fontWeight = FontWeight.Bold, fontSize = (size / 2).sp)
    }
}

@Composable
private fun SimplePage(modifier: Modifier, title: String, subtitle: String) {
    Column(modifier.fillMaxSize().padding(18.dp)) {
        Text(title, fontSize = 25.sp, fontWeight = FontWeight.Bold, color = Ink)
        Spacer(Modifier.height(8.dp))
        Text(subtitle, color = Color.Gray)
    }
}
