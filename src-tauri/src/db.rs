use rusqlite::{params, params_from_iter, Connection, OptionalExtension, ToSql};
use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Clone, Debug)]
pub struct Urutan {
    pub id: i64,
    pub name: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct Item {
    pub id: i64,
    pub urutan_id: i64,
    pub position: i64,
    pub title: String,
    pub text: String,
    pub library_item_id: Option<i64>,
    pub kind: Option<String>,
    pub slides: Vec<Slide>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SlideBackground {
    pub media_type: String,
    pub stored_name: String,
    pub path: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Slide {
    pub text: String,
    pub background: Option<SlideBackground>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MediaItem {
    pub item_id: i64,
    pub media_type: String,
    pub file_name: String,
    pub stored_name: String,
    pub width: Option<i64>,
    pub height: Option<i64>,
    pub path: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct Tag {
    pub id: i64,
    pub name: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct LibraryItem {
    pub id: i64,
    pub kind: String,
    pub title: String,
    pub tags: Vec<Tag>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LibraryItemDetail {
    pub id: i64,
    pub kind: String,
    pub title: String,
    pub tags: Vec<Tag>,
    pub text: String,
    pub slides: Vec<PresentationSlide>,
    pub media: Option<MediaItem>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PresentationSlide {
    pub id: i64,
    pub item_id: i64,
    pub position: i64,
    pub title: String,
    pub body: String,
    pub background_media_id: Option<i64>,
}

pub fn connect(app: &AppHandle) -> rusqlite::Result<Connection> {
    let dir = app
        .path()
        .app_data_dir()
        .expect("app data dir should resolve");
    std::fs::create_dir_all(&dir).expect("app data dir should be creatable");
    let conn = Connection::open(dir.join("openpresenter.db"))?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if version < 1 {
        conn.execute_batch(
            "BEGIN;
            CREATE TABLE urutan (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE item (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                urutan_id INTEGER NOT NULL REFERENCES urutan(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                title TEXT NOT NULL,
                text TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            PRAGMA user_version = 1;
            COMMIT;",
        )?;
    }
    if version < 2 {
        conn.execute_batch(
            "BEGIN;
            CREATE TABLE song (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                text TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE tag (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );
            CREATE TABLE song_tag (
                song_id INTEGER NOT NULL REFERENCES song(id) ON DELETE CASCADE,
                tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
                PRIMARY KEY (song_id, tag_id)
            );
            ALTER TABLE item ADD COLUMN song_id INTEGER REFERENCES song(id) ON DELETE SET NULL;
            PRAGMA user_version = 2;
            COMMIT;",
        )?;
    }
    if version < 3 {
        conn.pragma_update(None, "foreign_keys", "OFF")?;
        conn.execute_batch(
            "BEGIN;
            CREATE TABLE library_item (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL CHECK (kind IN ('song', 'presentation')),
                title TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE library_item_tag (
                item_id INTEGER NOT NULL REFERENCES library_item(id) ON DELETE CASCADE,
                tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
                PRIMARY KEY (item_id, tag_id)
            );
            CREATE TABLE song_data (
                item_id INTEGER PRIMARY KEY REFERENCES library_item(id) ON DELETE CASCADE,
                text TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE presentation_slide (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER NOT NULL REFERENCES library_item(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                title TEXT NOT NULL DEFAULT '',
                body TEXT NOT NULL DEFAULT ''
            );
            INSERT INTO library_item (id, kind, title, created_at, updated_at)
                SELECT id, 'song', title, created_at, updated_at FROM song;
            INSERT INTO song_data (item_id, text)
                SELECT id, text FROM song;
            INSERT INTO library_item_tag (item_id, tag_id)
                SELECT song_id, tag_id FROM song_tag;
            DROP TABLE song_tag;
            DROP TABLE song;
            CREATE TABLE item_v3 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                urutan_id INTEGER NOT NULL REFERENCES urutan(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                title TEXT NOT NULL,
                text TEXT NOT NULL DEFAULT '',
                library_item_id INTEGER REFERENCES library_item(id) ON DELETE SET NULL
            );
            INSERT INTO item_v3 (id, urutan_id, position, title, text, library_item_id)
                SELECT id, urutan_id, position, title, text, song_id FROM item;
            DROP TABLE item;
            ALTER TABLE item_v3 RENAME TO item;
            PRAGMA user_version = 3;
            COMMIT;",
        )?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
    }
    if version < 4 {
        conn.pragma_update(None, "foreign_keys", "OFF")?;
        conn.execute_batch(
            "BEGIN;
            CREATE TABLE library_item_v4 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL CHECK (kind IN ('song', 'presentation', 'media')),
                title TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            INSERT INTO library_item_v4 (id, kind, title, created_at, updated_at)
                SELECT id, kind, title, created_at, updated_at FROM library_item;
            DROP TABLE library_item;
            ALTER TABLE library_item_v4 RENAME TO library_item;
            CREATE TABLE media_item (
                item_id INTEGER PRIMARY KEY REFERENCES library_item(id) ON DELETE CASCADE,
                media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
                file_name TEXT NOT NULL,
                stored_name TEXT NOT NULL,
                width INTEGER,
                height INTEGER
            );
            ALTER TABLE presentation_slide ADD COLUMN background_media_id INTEGER REFERENCES library_item(id) ON DELETE SET NULL;
            PRAGMA user_version = 4;
            COMMIT;",
        )?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
    }
    Ok(())
}

pub fn get_urutan(conn: &Connection, id: i64) -> rusqlite::Result<Option<Urutan>> {
    let mut stmt = conn.prepare("SELECT id, name FROM urutan WHERE id = ?1")?;
    let mut rows = stmt
        .query_map(params![id], |r| Ok(Urutan {
            id: r.get(0)?,
            name: r.get(1)?,
        }))?;
    rows.next().transpose()
}

pub fn list_urutan(conn: &Connection) -> rusqlite::Result<Vec<Urutan>> {
    let mut stmt = conn.prepare(
        "SELECT id, name FROM urutan ORDER BY updated_at DESC, id DESC",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(Urutan {
            id: r.get(0)?,
            name: r.get(1)?,
        })
    })?;
    rows.collect()
}

pub fn create_urutan(conn: &Connection, name: &str) -> rusqlite::Result<Urutan> {
    conn.execute("INSERT INTO urutan (name) VALUES (?1)", params![name])?;
    let id = conn.last_insert_rowid();
    Ok(Urutan {
        id,
        name: name.to_string(),
    })
}

pub fn delete_urutan(conn: &Connection, id: i64) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM urutan WHERE id = ?1", params![id])?;
    Ok(())
}

fn fetch_slides(conn: &Connection, item: &Item) -> rusqlite::Result<Vec<Slide>> {
    match item.kind.as_deref() {
        Some("presentation") => match item.library_item_id {
            Some(id) => slides_for_item(conn, id),
            None => Ok(Vec::new()),
        },
        Some("media") => match item.library_item_id {
            Some(id) => media_slide_for_item(conn, id),
            None => Ok(Vec::new()),
        },
        _ => Ok(Vec::new()),
    }
}

pub fn list_items(conn: &Connection, urutan_id: i64) -> rusqlite::Result<Vec<Item>> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.urutan_id, i.position,
                COALESCE(l.title, i.title) AS title,
                COALESCE(sd.text, i.text) AS text,
                i.library_item_id,
                l.kind
         FROM item i
         LEFT JOIN library_item l ON l.id = i.library_item_id
         LEFT JOIN song_data sd ON sd.item_id = i.library_item_id
         WHERE i.urutan_id = ?1 ORDER BY i.position",
    )?;
    let rows = stmt.query_map(params![urutan_id], |r| {
        Ok(Item {
            id: r.get(0)?,
            urutan_id: r.get(1)?,
            position: r.get(2)?,
            title: r.get(3)?,
            text: r.get(4)?,
            library_item_id: r.get(5)?,
            kind: r.get(6)?,
            slides: Vec::new(),
        })
    })?;
    let mut items = Vec::new();
    for row in rows {
        let mut item = row?;
        item.slides = fetch_slides(conn, &item)?;
        items.push(item);
    }
    Ok(items)
}

pub fn get_item(conn: &Connection, id: i64) -> rusqlite::Result<Option<Item>> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.urutan_id, i.position,
                COALESCE(l.title, i.title) AS title,
                COALESCE(sd.text, i.text) AS text,
                i.library_item_id,
                l.kind
         FROM item i
         LEFT JOIN library_item l ON l.id = i.library_item_id
         LEFT JOIN song_data sd ON sd.item_id = i.library_item_id
         WHERE i.id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], |r| {
        Ok(Item {
            id: r.get(0)?,
            urutan_id: r.get(1)?,
            position: r.get(2)?,
            title: r.get(3)?,
            text: r.get(4)?,
            library_item_id: r.get(5)?,
            kind: r.get(6)?,
            slides: Vec::new(),
        })
    })?;
    let mut item = match rows.next().transpose()? {
        Some(item) => item,
        None => return Ok(None),
    };
    item.slides = fetch_slides(conn, &item)?;
    Ok(Some(item))
}

pub fn add_item(
    conn: &Connection,
    urutan_id: i64,
    title: &str,
    text: &str,
) -> rusqlite::Result<Item> {
    let position: i64 = conn.query_row(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM item WHERE urutan_id = ?1",
        params![urutan_id],
        |r| r.get(0),
    )?;
    conn.execute(
        "INSERT INTO item (urutan_id, position, title, text) VALUES (?1, ?2, ?3, ?4)",
        params![urutan_id, position, title, text],
    )?;
    let id = conn.last_insert_rowid();
    get_item(conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn add_library_item_to_urutan(
    conn: &Connection,
    urutan_id: i64,
    library_item_id: i64,
) -> rusqlite::Result<Item> {
    let title: String = conn.query_row(
        "SELECT title FROM library_item WHERE id = ?1",
        params![library_item_id],
        |r| r.get(0),
    )?;
    let position: i64 = conn.query_row(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM item WHERE urutan_id = ?1",
        params![urutan_id],
        |r| r.get(0),
    )?;
    conn.execute(
        "INSERT INTO item (urutan_id, position, title, text, library_item_id)
         VALUES (?1, ?2, ?3, '', ?4)",
        params![urutan_id, position, title, library_item_id],
    )?;
    let id = conn.last_insert_rowid();
    get_item(conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn save_item(conn: &Connection, id: i64, title: &str, text: &str) -> rusqlite::Result<Item> {
    conn.execute(
        "UPDATE item SET title = ?1, text = ?2 WHERE id = ?3",
        params![title, text, id],
    )?;
    get_item(conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn delete_item(conn: &Connection, id: i64) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM item WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn reorder_item(
    conn: &mut Connection,
    urutan_id: i64,
    item_id: i64,
    new_position: i64,
) -> rusqlite::Result<()> {
    let items = list_items(conn, urutan_id)?;
    let mut ids: Vec<i64> = items.iter().map(|i| i.id).collect();
    ids.retain(|&x| x != item_id);
    let clamped = new_position.clamp(0, ids.len() as i64) as usize;
    ids.insert(clamped, item_id);
    let tx = conn.transaction()?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE item SET position = ?1 WHERE id = ?2 AND urutan_id = ?3",
            params![index as i64, id, urutan_id],
        )?;
    }
    tx.commit()?;
    Ok(())
}

pub fn get_meta(conn: &Connection, key: &str) -> rusqlite::Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM meta WHERE key = ?1")?;
    match stmt.query_row(params![key], |r| r.get::<_, String>(0)) {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn set_meta(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO meta (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = ?2",
        params![key, value],
    )?;
    Ok(())
}

/* ---------- Unified library ---------- */

pub fn list_library(
    conn: &Connection,
    kind: Option<&str>,
    title: Option<&str>,
    tags: &[String],
) -> rusqlite::Result<Vec<LibraryItem>> {
    let mut join = String::new();
    let mut wheres: Vec<String> = Vec::new();
    let mut havings: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn ToSql>> = Vec::new();

    if !tags.is_empty() {
        join.push_str(" JOIN library_item_tag lit ON lit.item_id = l.id");
        join.push_str(" JOIN tag t ON t.id = lit.tag_id");
        let placeholders = tags.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        wheres.push(format!("t.name IN ({placeholders})"));
        for tag in tags {
            values.push(Box::new(tag.clone()));
        }
        havings.push(format!("COUNT(DISTINCT t.id) = {}", tags.len()));
    }
    if let Some(k) = kind {
        let k = k.trim();
        if !k.is_empty() {
            wheres.push("l.kind = ?".to_string());
            values.push(Box::new(k.to_string()));
        }
    }
    if let Some(t) = title {
        let t = t.trim();
        if !t.is_empty() {
            wheres.push("l.title LIKE ?".to_string());
            values.push(Box::new(format!("%{t}%")));
        }
    }

    let mut sql = "SELECT l.id, l.kind, l.title FROM library_item l".to_string();
    sql.push_str(&join);
    if !wheres.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&wheres.join(" AND "));
    }
    if !havings.is_empty() {
        sql.push_str(" GROUP BY l.id, l.kind, l.title HAVING ");
        sql.push_str(&havings.join(" AND "));
    }
    sql.push_str(" ORDER BY l.title COLLATE NOCASE");

    let mut stmt = conn.prepare(&sql)?;
    let value_refs: Vec<&dyn ToSql> = values.iter().map(|v| v.as_ref()).collect();
    let rows = stmt.query_map(params_from_iter(value_refs), |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
        ))
    })?;

    let mut items = Vec::new();
    for row in rows {
        let (id, kind, title) = row?;
        let tags = list_item_tags(conn, id)?;
        items.push(LibraryItem { id, kind, title, tags });
    }
    Ok(items)
}

pub fn get_library_item_detail(
    conn: &Connection,
    id: i64,
) -> rusqlite::Result<Option<LibraryItemDetail>> {
    let mut stmt = conn.prepare("SELECT id, kind, title FROM library_item WHERE id = ?1")?;
    let mut rows = stmt.query_map(params![id], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
        ))
    })?;
    let row = rows.next().transpose()?;
    match row {
        Some((id, kind, title)) => {
            let tags = list_item_tags(conn, id)?;
            let text = if kind == "song" {
                conn.query_row(
                    "SELECT COALESCE(text, '') FROM song_data WHERE item_id = ?1",
                    params![id],
                    |r| r.get(0),
                )
                .unwrap_or_default()
            } else {
                String::new()
            };
            let slides = if kind == "presentation" {
                list_presentation_slides(conn, id)?
            } else {
                Vec::new()
            };
            let media = if kind == "media" { get_media_item(conn, id)? } else { None };
            Ok(Some(LibraryItemDetail {
                id,
                kind,
                title,
                tags,
                text,
                slides,
                media,
            }))
        }
        None => Ok(None),
    }
}

pub fn create_library_item(conn: &Connection, kind: &str, title: &str) -> rusqlite::Result<LibraryItem> {
    conn.execute(
        "INSERT INTO library_item (kind, title) VALUES (?1, ?2)",
        params![kind, title],
    )?;
    let id = conn.last_insert_rowid();
    Ok(LibraryItem {
        id,
        kind: kind.to_string(),
        title: title.to_string(),
        tags: Vec::new(),
    })
}

pub fn rename_library_item(conn: &Connection, id: i64, title: &str) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE library_item SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![title, id],
    )?;
    Ok(())
}

pub fn get_media_item(conn: &Connection, id: i64) -> rusqlite::Result<Option<MediaItem>> {
    let mut stmt = conn.prepare(
        "SELECT item_id, media_type, file_name, stored_name, width, height
         FROM media_item WHERE item_id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], |r| {
        Ok(MediaItem {
            item_id: r.get(0)?,
            media_type: r.get(1)?,
            file_name: r.get(2)?,
            stored_name: r.get(3)?,
            width: r.get(4)?,
            height: r.get(5)?,
            path: String::new(),
        })
    })?;
    rows.next().transpose()
}

pub fn create_media(
    conn: &Connection,
    title: &str,
    media_type: &str,
    file_name: &str,
    stored_name: &str,
) -> rusqlite::Result<LibraryItem> {
    conn.execute(
        "INSERT INTO library_item (kind, title) VALUES ('media', ?1)",
        params![title],
    )?;
    let id = conn.last_insert_rowid();
    conn.execute(
        "INSERT INTO media_item (item_id, media_type, file_name, stored_name) VALUES (?1, ?2, ?3, ?4)",
        params![id, media_type, file_name, stored_name],
    )?;
    Ok(LibraryItem {
        id,
        kind: "media".to_string(),
        title: title.to_string(),
        tags: Vec::new(),
    })
}

pub fn set_slide_background(conn: &Connection, slide_id: i64, media_item_id: Option<i64>) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE presentation_slide SET background_media_id = ?1 WHERE id = ?2",
        params![media_item_id, slide_id],
    )?;
    Ok(())
}

pub fn delete_library_item(conn: &Connection, id: i64) -> rusqlite::Result<Option<String>> {
    let kind: Option<String> = conn
        .query_row("SELECT kind FROM library_item WHERE id = ?1", params![id], |r| r.get(0))
        .optional()?;
    let mut stored_name: Option<String> = None;
    if let Some(kind) = kind {
        if kind == "media" {
            stored_name = conn
                .query_row(
                    "SELECT stored_name FROM media_item WHERE item_id = ?1",
                    params![id],
                    |r| r.get(0),
                )
                .optional()?;
            conn.execute(
                "UPDATE item SET library_item_id = NULL WHERE library_item_id = ?1",
                params![id],
            )?;
        } else {
            let snapshot: String = if kind == "presentation" {
                slides_for_item(conn, id)?
                    .into_iter()
                    .map(|s| s.text)
                    .collect::<Vec<_>>()
                    .join("\n\n")
            } else {
                conn.query_row(
                    "SELECT COALESCE(text, '') FROM song_data WHERE item_id = ?1",
                    params![id],
                    |r| r.get(0),
                )
                .unwrap_or_default()
            };
            conn.execute(
                "UPDATE item SET text = ?1, library_item_id = NULL WHERE library_item_id = ?2",
                params![snapshot, id],
            )?;
        }
    }
    conn.execute("DELETE FROM library_item WHERE id = ?1", params![id])?;
    Ok(stored_name)
}

pub fn save_song_text(conn: &Connection, item_id: i64, text: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO song_data (item_id, text) VALUES (?1, ?2)
         ON CONFLICT(item_id) DO UPDATE SET text = ?2",
        params![item_id, text],
    )?;
    Ok(())
}

pub fn list_presentation_slides(
    conn: &Connection,
    item_id: i64,
) -> rusqlite::Result<Vec<PresentationSlide>> {
    let mut stmt = conn.prepare(
        "SELECT id, item_id, position, title, body, background_media_id
         FROM presentation_slide WHERE item_id = ?1 ORDER BY position",
    )?;
    let rows = stmt.query_map(params![item_id], |r| {
        Ok(PresentationSlide {
            id: r.get(0)?,
            item_id: r.get(1)?,
            position: r.get(2)?,
            title: r.get(3)?,
            body: r.get(4)?,
            background_media_id: r.get(5)?,
        })
    })?;
    rows.collect()
}

pub fn add_presentation_slide(
    conn: &Connection,
    item_id: i64,
    title: &str,
    body: &str,
) -> rusqlite::Result<PresentationSlide> {
    let position: i64 = conn.query_row(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM presentation_slide WHERE item_id = ?1",
        params![item_id],
        |r| r.get(0),
    )?;
    conn.execute(
        "INSERT INTO presentation_slide (item_id, position, title, body) VALUES (?1, ?2, ?3, ?4)",
        params![item_id, position, title, body],
    )?;
    let id = conn.last_insert_rowid();
    Ok(PresentationSlide {
        id,
        item_id,
        position,
        title: title.to_string(),
        body: body.to_string(),
        background_media_id: None,
    })
}

pub fn save_presentation_slide(
    conn: &Connection,
    id: i64,
    title: &str,
    body: &str,
) -> rusqlite::Result<PresentationSlide> {
    conn.execute(
        "UPDATE presentation_slide SET title = ?1, body = ?2 WHERE id = ?3",
        params![title, body, id],
    )?;
    let mut stmt = conn.prepare(
        "SELECT id, item_id, position, title, body, background_media_id FROM presentation_slide WHERE id = ?1",
    )?;
    stmt.query_row(params![id], |r| {
        Ok(PresentationSlide {
            id: r.get(0)?,
            item_id: r.get(1)?,
            position: r.get(2)?,
            title: r.get(3)?,
            body: r.get(4)?,
            background_media_id: r.get(5)?,
        })
    })
}

pub fn delete_presentation_slide(conn: &Connection, id: i64) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM presentation_slide WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn move_presentation_slide(
    conn: &mut Connection,
    item_id: i64,
    slide_id: i64,
    new_position: i64,
) -> rusqlite::Result<()> {
    let slides = list_presentation_slides(conn, item_id)?;
    let mut ids: Vec<i64> = slides.iter().map(|s| s.id).collect();
    ids.retain(|&x| x != slide_id);
    let clamped = new_position.clamp(0, ids.len() as i64) as usize;
    ids.insert(clamped, slide_id);
    let tx = conn.transaction()?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE presentation_slide SET position = ?1 WHERE id = ?2",
            params![index as i64, id],
        )?;
    }
    tx.commit()?;
    Ok(())
}

pub fn slides_for_item(conn: &Connection, item_id: i64) -> rusqlite::Result<Vec<Slide>> {
    let mut stmt = conn.prepare(
        "SELECT CASE WHEN ps.body != '' THEN ps.body ELSE ps.title END AS s,
                mi.media_type, mi.stored_name
         FROM presentation_slide ps
         LEFT JOIN library_item li ON li.id = ps.background_media_id
         LEFT JOIN media_item mi ON mi.item_id = li.id
         WHERE ps.item_id = ?1 ORDER BY ps.position",
    )?;
    let rows = stmt.query_map(params![item_id], |r| {
        Ok(Slide {
            text: r.get::<_, String>(0)?,
            background: match r.get::<_, Option<String>>(1)? {
                Some(media_type) => Some(SlideBackground {
                    media_type,
                    stored_name: r.get::<_, String>(2)?,
                    path: String::new(),
                }),
                None => None,
            },
        })
    })?;
    rows.collect()
}

fn media_slide_for_item(conn: &Connection, item_id: i64) -> rusqlite::Result<Vec<Slide>> {
    let mut stmt = conn.prepare(
        "SELECT media_type, stored_name FROM media_item WHERE item_id = ?1",
    )?;
    let mut rows = stmt.query_map(params![item_id], |r| {
        Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
    })?;
    let row = rows.next().transpose()?;
    match row {
        Some((media_type, stored_name)) => Ok(vec![Slide {
            text: String::new(),
            background: Some(SlideBackground {
                media_type,
                stored_name,
                path: String::new(),
            }),
        }]),
        None => Ok(Vec::new()),
    }
}

pub fn list_tags(conn: &Connection) -> rusqlite::Result<Vec<Tag>> {
    let mut stmt = conn.prepare("SELECT id, name FROM tag ORDER BY name COLLATE NOCASE")?;
    let rows = stmt.query_map([], |r| {
        Ok(Tag {
            id: r.get(0)?,
            name: r.get(1)?,
        })
    })?;
    rows.collect()
}

pub fn list_item_tags(conn: &Connection, item_id: i64) -> rusqlite::Result<Vec<Tag>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name FROM tag t
         JOIN library_item_tag lit ON lit.tag_id = t.id
         WHERE lit.item_id = ?1 ORDER BY t.name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map(params![item_id], |r| {
        Ok(Tag {
            id: r.get(0)?,
            name: r.get(1)?,
        })
    })?;
    rows.collect()
}

pub fn add_item_tag(conn: &Connection, item_id: i64, name: &str) -> rusqlite::Result<Tag> {
    let name = name.trim();
    conn.execute("INSERT OR IGNORE INTO tag (name) VALUES (?1)", params![name])?;
    let tag: Tag = conn.query_row("SELECT id, name FROM tag WHERE name = ?1", params![name], |r| {
        Ok(Tag {
            id: r.get(0)?,
            name: r.get(1)?,
        })
    })?;
    conn.execute(
        "INSERT OR IGNORE INTO library_item_tag (item_id, tag_id) VALUES (?1, ?2)",
        params![item_id, tag.id],
    )?;
    Ok(tag)
}

pub fn remove_item_tag(conn: &Connection, item_id: i64, tag_id: i64) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM library_item_tag WHERE item_id = ?1 AND tag_id = ?2",
        params![item_id, tag_id],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();
        migrate(&conn).unwrap();
        conn
    }

    #[test]
    fn migration_v3_preserves_v2_song_data() {
        let conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();
        conn.execute_batch(
            "BEGIN;
            CREATE TABLE urutan (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
            CREATE TABLE item (id INTEGER PRIMARY KEY AUTOINCREMENT, urutan_id INTEGER NOT NULL REFERENCES urutan(id) ON DELETE CASCADE, position INTEGER NOT NULL, title TEXT NOT NULL, text TEXT NOT NULL DEFAULT '', song_id INTEGER REFERENCES song(id) ON DELETE SET NULL);
            CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE song (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, text TEXT NOT NULL DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
            CREATE TABLE tag (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
            CREATE TABLE song_tag (song_id INTEGER NOT NULL REFERENCES song(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE, PRIMARY KEY (song_id, tag_id));
            PRAGMA user_version = 2;
            COMMIT;",
        )
        .unwrap();

        let u = create_urutan(&conn, "U").unwrap();
        conn.execute("INSERT INTO song (title, text) VALUES ('Lagu', 'V1\n\nV2')", [])
            .unwrap();
        let song_id = conn.last_insert_rowid();
        conn.execute("INSERT INTO tag (name) VALUES ('Pujian')", []).unwrap();
        let tag_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO song_tag (song_id, tag_id) VALUES (?1, ?2)",
            params![song_id, tag_id],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO item (urutan_id, position, title, text, song_id) VALUES (?1, 0, 'Lagu', '', ?2)",
            params![u.id, song_id],
        )
        .unwrap();

        migrate(&conn).unwrap();

        let detail = get_library_item_detail(&conn, song_id).unwrap().unwrap();
        assert_eq!(detail.kind, "song");
        assert_eq!(detail.title, "Lagu");
        assert_eq!(detail.text, "V1\n\nV2");
        assert_eq!(detail.tags.len(), 1);
        assert_eq!(detail.tags[0].name, "Pujian");

        let items = list_items(&conn, u.id).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].library_item_id, Some(song_id));
        assert_eq!(items[0].text, "V1\n\nV2");
    }

    #[test]
    fn library_kind_title_tag_filters() {
        let conn = test_conn();
        let s1 = create_library_item(&conn, "song", "Ku Puji").unwrap();
        let s2 = create_library_item(&conn, "song", "Tuhan").unwrap();
        let p1 = create_library_item(&conn, "presentation", "Khotbah Minggu").unwrap();
        add_item_tag(&conn, s1.id, "Pujian").unwrap();
        add_item_tag(&conn, s1.id, "Worship").unwrap();
        add_item_tag(&conn, p1.id, "Worship").unwrap();

        let songs = list_library(&conn, Some("song"), None, &[]).unwrap();
        assert_eq!(songs.len(), 2);

        let pres = list_library(&conn, Some("presentation"), None, &[]).unwrap();
        assert_eq!(pres.len(), 1);
        assert_eq!(pres[0].id, p1.id);

        let both = list_library(&conn, None, None, &["Worship".to_string()]).unwrap();
        assert_eq!(both.len(), 2);

        let pj = list_library(&conn, None, None, &["Pujian".to_string(), "Worship".to_string()]).unwrap();
        assert_eq!(pj.len(), 1);
        assert_eq!(pj[0].id, s1.id);

        let title = list_library(&conn, None, Some("khotbah"), &[]).unwrap();
        assert_eq!(title.len(), 1);
        assert_eq!(title[0].id, p1.id);
    }

    #[test]
    fn presentation_slides_crud_and_snapshot() {
        let mut conn = test_conn();
        let p = create_library_item(&conn, "presentation", "Outline").unwrap();
        let s1 = add_presentation_slide(&conn, p.id, "Intro", "Selamat pagi").unwrap();
        let s2 = add_presentation_slide(&conn, p.id, "Poin 1", "Isi poin satu").unwrap();
        add_presentation_slide(&conn, p.id, "Poin 2", "Isi poin dua").unwrap();

        let slides = list_presentation_slides(&conn, p.id).unwrap();
        assert_eq!(slides.len(), 3);

        move_presentation_slide(&mut conn, p.id, s1.id, 2).unwrap();
        let slides = list_presentation_slides(&conn, p.id).unwrap();
        assert_eq!(slides[0].id, s2.id);

        save_presentation_slide(&conn, s2.id, "Poin 1", "Isi poin satu (edit)").unwrap();

        assert_eq!(slides_for_item(&conn, p.id).unwrap().len(), 3);

        let u = create_urutan(&conn, "U").unwrap();
        let item = add_library_item_to_urutan(&conn, u.id, p.id).unwrap();
        assert_eq!(item.kind.as_deref(), Some("presentation"));
        assert_eq!(item.slides.len(), 3);

        delete_library_item(&conn, p.id).unwrap();
        let item = get_item(&conn, item.id).unwrap().unwrap();
        assert_eq!(item.library_item_id, None);
        assert_eq!(item.slides.len(), 0);
        assert!(item.text.contains("Isi poin satu (edit)"));
    }

    #[test]
    fn song_delete_snapshots_text() {
        let conn = test_conn();
        let s = create_library_item(&conn, "song", "X").unwrap();
        save_song_text(&conn, s.id, "Lyric A\n\nLyric B").unwrap();
        let u = create_urutan(&conn, "U").unwrap();
        let item = add_library_item_to_urutan(&conn, u.id, s.id).unwrap();
        assert_eq!(item.text, "Lyric A\n\nLyric B");

        delete_library_item(&conn, s.id).unwrap();
        let item = get_item(&conn, item.id).unwrap().unwrap();
        assert_eq!(item.library_item_id, None);
        assert_eq!(item.text, "Lyric A\n\nLyric B");
    }

    #[test]
    fn media_library_and_slide_background() {
        let conn = test_conn();
        let m = create_media(&conn, "Gambar", "image", "gambar.png", "abc123.png").unwrap();
        assert_eq!(m.kind, "media");
        let media = get_media_item(&conn, m.id).unwrap().unwrap();
        assert_eq!(media.stored_name, "abc123.png");

        let u = create_urutan(&conn, "U").unwrap();
        let item = add_library_item_to_urutan(&conn, u.id, m.id).unwrap();
        assert_eq!(item.kind.as_deref(), Some("media"));
        assert_eq!(item.slides.len(), 1);
        assert_eq!(item.slides[0].text, "");
        let bg = item.slides[0].background.as_ref().unwrap();
        assert_eq!(bg.media_type, "image");
        assert_eq!(bg.stored_name, "abc123.png");

        let p = create_library_item(&conn, "presentation", "Outline").unwrap();
        let s = add_presentation_slide(&conn, p.id, "Intro", "Selamat pagi").unwrap();
        set_slide_background(&conn, s.id, Some(m.id)).unwrap();
        let slides = slides_for_item(&conn, p.id).unwrap();
        assert_eq!(slides[0].background.as_ref().unwrap().media_type, "image");

        set_slide_background(&conn, s.id, None).unwrap();
        let slides = slides_for_item(&conn, p.id).unwrap();
        assert!(slides[0].background.is_none());

        let stored = delete_library_item(&conn, m.id).unwrap();
        assert_eq!(stored.as_deref(), Some("abc123.png"));
    }
}
