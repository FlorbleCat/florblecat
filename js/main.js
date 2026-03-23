const DISCORD_USER_ID = "ID_WILL_GO_HERE"; // i lwk need to remember to put my id here later

const LANYARD_URL = (id) => `https://api.lanyard.rest/v1/users/${id}`;

const els = {
  year: document.getElementById("year"),

  displayName: document.getElementById("displayName"),
  username: document.getElementById("username"),
  avatar: document.getElementById("avatar"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  discordLink: document.getElementById("discordLink"),
  profileDiscordLink: document.getElementById("profileDiscordLink"),

  npBadge: document.getElementById("npBadge"),
  npArt: document.getElementById("npArt"),
  npSong: document.getElementById("npSong"),
  npArtist: document.getElementById("npArtist"),
  npProgress: document.getElementById("npProgress"),
  npTimeNow: document.getElementById("npTimeNow"),
  npTimeTotal: document.getElementById("npTimeTotal"),
  npOpen: document.getElementById("npOpen"),

  dcStatus: document.getElementById("dcStatus"),
  dcActivity: document.getElementById("dcActivity"),
};

function fmtTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function safeSet(el, value) {
  if (el) el.textContent = value;
}

function safeSetImg(el, src) {
  if (el) el.src = src || "";
}

function safeSetHref(el, href) {
  if (el) el.href = href || "#";
}

function setStatusColor(status) {
  const map = {
    online: "rgba(0, 255, 160, 0.75)",
    idle: "rgba(255, 200, 0, 0.85)",
    dnd: "rgba(255, 70, 70, 0.85)",
    offline: "rgba(180, 180, 180, 0.55)",
  };

  if (els.statusDot) {
    els.statusDot.style.background = map[status] || map.offline;
  }
}

function prettyStatus(status) {
  const map = {
    online: "Online",
    idle: "Idle",
    dnd: "Do Not Disturb",
    offline: "Offline",
  };

  return map[status] || "Offline";
}

function pickActivity(data) {
  const acts = Array.isArray(data.activities) ? data.activities : [];
  const playing = acts.find((a) => a.type === 0 && a.name);
  return playing || acts.find((a) => a.name) || null;
}

function setNowPlayingArtVisible(visible) {
  const wrap = els.npArt ? els.npArt.closest(".nowplaying") : null;

  if (els.npArt) {
    els.npArt.classList.toggle("is-hidden", !visible);
  }

  if (wrap) {
    wrap.classList.toggle("no-art", !visible);
  }
}

function updateUI(payload) {
  const data = payload?.data;
  if (!data) return;

  const discordUser = data.discord_user || {};
  const name =
    discordUser.display_name ||
    discordUser.global_name ||
    discordUser.username ||
    "User";

  const discriminator =
    discordUser.discriminator && discordUser.discriminator !== "0"
      ? `#${discordUser.discriminator}`
      : "";

  safeSet(els.displayName, name);
  safeSet(els.username, `${discordUser.username || name}${discriminator}`);

  if (discordUser.id && discordUser.avatar) {
    const avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`;
    safeSetImg(els.avatar, avatarUrl);
  }

  const status = data.discord_status || "offline";
  setStatusColor(status);
  safeSet(els.statusText, prettyStatus(status));
  safeSet(els.dcStatus, prettyStatus(status));

  const discordProfileUrl = `https://discord.com/users/${discordUser.id || DISCORD_USER_ID}`;
  safeSetHref(els.discordLink, discordProfileUrl);
  safeSetHref(els.profileDiscordLink, discordProfileUrl);

  const activity = pickActivity(data);
  safeSet(els.dcActivity, activity ? activity.name : "—");

  const spotify = data.spotify;
  const isListening = !!spotify;

  safeSet(els.npBadge, isListening ? "listening" : "not playing");

  if (isListening) {
    setNowPlayingArtVisible(true);

    safeSetImg(els.npArt, spotify.album_art_url);
    safeSet(els.npSong, spotify.song);
    safeSet(els.npArtist, spotify.artist);

    const now = Date.now();
    const elapsed = now - spotify.timestamps.start;
    const total = spotify.timestamps.end - spotify.timestamps.start;
    const pct =
      total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;

    if (els.npProgress) {
      els.npProgress.style.width = `${pct}%`;
    }

    safeSet(els.npTimeNow, fmtTime(elapsed));
    safeSet(els.npTimeTotal, fmtTime(total));

    if (spotify.track_id) {
      safeSetHref(els.npOpen, `https://open.spotify.com/track/${spotify.track_id}`);
    } else {
      const q = encodeURIComponent(`${spotify.song} ${spotify.artist}`);
      safeSetHref(els.npOpen, `https://open.spotify.com/search/${q}`);
    }
  } else {
    setNowPlayingArtVisible(false);

    safeSetImg(els.npArt, "");
    safeSet(els.npSong, "Nothing playing");
    safeSet(els.npArtist, "Check back later");

    if (els.npProgress) {
      els.npProgress.style.width = "0%";
    }

    safeSet(els.npTimeNow, "0:00");
    safeSet(els.npTimeTotal, "0:00");
    safeSetHref(els.npOpen, "https://open.spotify.com/");
  }
}

async function fetchLanyard() {
  if (!DISCORD_USER_ID || !/^\d+$/.test(DISCORD_USER_ID)) {
    console.error("DISCORD_USER_ID is missing or invalid.");
    return;
  }

  try {
    const res = await fetch(LANYARD_URL(DISCORD_USER_ID), {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    updateUI(json);
  } catch (error) {
    safeSet(els.npBadge, "error");
    console.error("Failed to fetch Lanyard data:", error);
  }
}

function init() {
  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  setNowPlayingArtVisible(false);
  fetchLanyard();
  setInterval(fetchLanyard, 100);
}

document.addEventListener("DOMContentLoaded", init);