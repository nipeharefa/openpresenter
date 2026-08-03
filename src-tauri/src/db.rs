use rusqlite::{params, Connection};
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
    pub song_id: Option<i64>,
}

#[derive(Serialize, Clone, Debug)]
pub struct Tag {
    pub id: i64,
    pub name: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct Song {
    pub id: i64,
    pub title: String,
    pub text: String,
    pub tags: Vec<Tag>,
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

pub fn list_items(conn: &Connection, urutan_id: i64) -> rusqlite::Result<Vec<Item>> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.urutan_id, i.position,
                COALESCE(s.title, i.title) AS title,
                COALESCE(s.text, i.text) AS text,
                i.song_id
         FROM item i LEFT JOIN song s ON s.id = i.song_id
         WHERE i.urutan_id = ?1 ORDER BY i.position",
    )?;
    let rows = stmt.query_map(params![urutan_id], |r| {
        Ok(Item {
            id: r.get(0)?,
            urutan_id: r.get(1)?,
            position: r.get(2)?,
            title: r.get(3)?,
            text: r.get(4)?,
            song_id: r.get(5)?,
        })
    })?;
    rows.collect()
}

pub fn get_item(conn: &Connection, id: i64) -> rusqlite::Result<Option<Item>> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.urutan_id, i.position,
                COALESCE(s.title, i.title) AS title,
                COALESCE(s.text, i.text) AS text,
                i.song_id
         FROM item i LEFT JOIN song s ON s.id = i.song_id
         WHERE i.id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], |r| {
        Ok(Item {
            id: r.get(0)?,
            urutan_id: r.get(1)?,
            position: r.get(2)?,
            title: r.get(3)?,
            text: r.get(4)?,
            song_id: r.get(5)?,
        })
    })?;
    rows.next().transpose()
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
    Ok(Item {
        id,
        urutan_id,
        position,
        title: title.to_string(),
        text: text.to_string(),
        song_id: None,
    })
}

pub fn add_song_to_urutan(
    conn: &Connection,
    urutan_id: i64,
    song_id: i64,
) -> rusqlite::Result<Item> {
    let song_title: String = conn.query_row(
        "SELECT title FROM song WHERE id = ?1",
        params![song_id],
        |r| r.get(0),
    )?;
    let position: i64 = conn.query_row(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM item WHERE urutan_id = ?1",
        params![urutan_id],
        |r| r.get(0),
    )?;
    conn.execute(
        "INSERT INTO item (urutan_id, position, title, text, song_id)
         VALUES (?1, ?2, ?3, '', ?4)",
        params![urutan_id, position, song_title, song_id],
    )?;
    let id = conn.last_insert_rowid();
    get_item(conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn save_item(conn: &Connection, id: i64, title: &str, text: &str) -> rusqlite::Result<Item> {
    conn.execute(
        "UPDATE item SET title = ?1, text = ?2 WHERE id = ?3",
        params![title, text, id],
    )?;
    get_item(conn, id)?
        .ok_or(rusqlite::Error::QueryReturnedNoRows)
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

pub fn get_song(conn: &Connection, id: i64) -> rusqlite::Result<Option<Song>> {
    let mut stmt = conn.prepare("SELECT id, title, text FROM song WHERE id = ?1")?;
    let mut rows = stmt.query_map(params![id], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
        ))
    })?;
    let row = rows.next().transpose()?;
    match row {
        Some((id, title, text)) => {
            let tags = list_song_tags(conn, id)?;
            Ok(Some(Song { id, title, text, tags }))
        }
        None => Ok(None),
    }
}

pub fn list_songs(
    conn: &Connection,
    title: Option<&str>,
    tags: &[String],
) -> rusqlite::Result<Vec<Song>> {
    let mut join = String::new();
    let mut wheres: Vec<String> = Vec::new();
    let mut havings: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if !tags.is_empty() {
        join.push_str(" JOIN song_tag st ON st.song_id = s.id");
        join.push_str(" JOIN tag t ON t.id = st.tag_id");
        let placeholders = tags.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        wheres.push(format!("t.name IN ({placeholders})"));
        for tag in tags {
            values.push(Box::new(tag.clone()));
        }
        havings.push(format!("COUNT(DISTINCT t.id) = {}", tags.len()));
    }
    if let Some(t) = title {
        let t = t.trim();
        if !t.is_empty() {
            wheres.push("s.title LIKE ?".to_string());
            values.push(Box::new(format!("%{t}%")));
        }
    }

    let mut sql = "SELECT s.id, s.title, s.text FROM song s".to_string();
    sql.push_str(&join);
    if !wheres.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&wheres.join(" AND "));
    }
    if !havings.is_empty() {
        sql.push_str(" GROUP BY s.id, s.title, s.text HAVING ");
        sql.push_str(&havings.join(" AND "));
    }
    sql.push_str(" ORDER BY s.title COLLATE NOCASE");

    let mut stmt = conn.prepare(&sql)?;
    let value_refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    let rows = stmt.query_map(rusqlite::params_from_iter(value_refs), |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
        ))
    })?;

    let mut songs = Vec::new();
    for row in rows {
        let (id, title, text) = row?;
        let tags = list_song_tags(conn, id)?;
        songs.push(Song { id, title, text, tags });
    }
    Ok(songs)
}

pub fn create_song(conn: &Connection, title: &str, text: &str) -> rusqlite::Result<Song> {
    conn.execute("INSERT INTO song (title, text) VALUES (?1, ?2)", params![title, text])?;
    let id = conn.last_insert_rowid();
    Ok(Song {
        id,
        title: title.to_string(),
        text: text.to_string(),
        tags: Vec::new(),
    })
}

pub fn save_song(conn: &Connection, id: i64, title: &str, text: &str) -> rusqlite::Result<Song> {
    conn.execute(
        "UPDATE song SET title = ?1, text = ?2, updated_at = datetime('now') WHERE id = ?3",
        params![title, text, id],
    )?;
    get_song(conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn delete_song(conn: &Connection, id: i64) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE item
         SET text = (SELECT text FROM song WHERE id = ?1), song_id = NULL
         WHERE song_id = ?1",
        params![id],
    )?;
    conn.execute("DELETE FROM song WHERE id = ?1", params![id])?;
    Ok(())
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

pub fn list_song_tags(conn: &Connection, song_id: i64) -> rusqlite::Result<Vec<Tag>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name FROM tag t
         JOIN song_tag st ON st.tag_id = t.id
         WHERE st.song_id = ?1 ORDER BY t.name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map(params![song_id], |r| {
        Ok(Tag {
            id: r.get(0)?,
            name: r.get(1)?,
        })
    })?;
    rows.collect()
}

pub fn add_song_tag(conn: &Connection, song_id: i64, name: &str) -> rusqlite::Result<Tag> {
    let name = name.trim();
    conn.execute("INSERT OR IGNORE INTO tag (name) VALUES (?1)", params![name])?;
    let tag: Tag = conn.query_row("SELECT id, name FROM tag WHERE name = ?1", params![name], |r| {
        Ok(Tag {
            id: r.get(0)?,
            name: r.get(1)?,
        })
    })?;
    conn.execute(
        "INSERT OR IGNORE INTO song_tag (song_id, tag_id) VALUES (?1, ?2)",
        params![song_id, tag.id],
    )?;
    Ok(tag)
}

pub fn remove_song_tag(conn: &Connection, song_id: i64, tag_id: i64) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM song_tag WHERE song_id = ?1 AND tag_id = ?2",
        params![song_id, tag_id],
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
    fn song_tag_filter_and_title() {
        let conn = test_conn();
        let a = create_song(&conn, "Ku Puji", "Verse\n\nChorus").unwrap();
        let b = create_song(&conn, "Tuhan", "One\n\nTwo").unwrap();
        add_song_tag(&conn, a.id, "Pujian").unwrap();
        add_song_tag(&conn, a.id, "Worship").unwrap();
        add_song_tag(&conn, b.id, "Worship").unwrap();

        let songs = list_songs(&conn, None, &["Pujian".to_string()]).unwrap();
        assert_eq!(songs.len(), 1);
        assert_eq!(songs[0].id, a.id);
        assert_eq!(songs[0].tags.len(), 2);

        let songs = list_songs(
            &conn,
            None,
            &["Pujian".to_string(), "Worship".to_string()],
        )
        .unwrap();
        assert_eq!(songs.len(), 1);
        assert_eq!(songs[0].id, a.id);

        let songs = list_songs(&conn, Some("tuhan"), &[]).unwrap();
        assert_eq!(songs.len(), 1);
        assert_eq!(songs[0].id, b.id);
    }

    #[test]
    fn remove_tag_and_delete_snapshot() {
        let conn = test_conn();
        let a = create_song(&conn, "X", "Lyric").unwrap();
        let tag = add_song_tag(&conn, a.id, "Fast").unwrap();
        remove_song_tag(&conn, a.id, tag.id).unwrap();
        assert_eq!(list_song_tags(&conn, a.id).unwrap().len(), 0);

        let u = create_urutan(&conn, "U").unwrap();
        let item = add_song_to_urutan(&conn, u.id, a.id).unwrap();
        assert_eq!(item.song_id, Some(a.id));
        assert_eq!(item.text, "Lyric");

        delete_song(&conn, a.id).unwrap();
        let item = get_item(&conn, item.id).unwrap().unwrap();
        assert_eq!(item.song_id, None);
        assert_eq!(item.text, "Lyric");
    }
}
