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
        "SELECT id, urutan_id, position, title, text
         FROM item WHERE urutan_id = ?1 ORDER BY position",
    )?;
    let rows = stmt.query_map(params![urutan_id], |r| {
        Ok(Item {
            id: r.get(0)?,
            urutan_id: r.get(1)?,
            position: r.get(2)?,
            title: r.get(3)?,
            text: r.get(4)?,
        })
    })?;
    rows.collect()
}

pub fn get_item(conn: &Connection, id: i64) -> rusqlite::Result<Option<Item>> {
    let mut stmt = conn.prepare(
        "SELECT id, urutan_id, position, title, text FROM item WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], |r| {
        Ok(Item {
            id: r.get(0)?,
            urutan_id: r.get(1)?,
            position: r.get(2)?,
            title: r.get(3)?,
            text: r.get(4)?,
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
    })
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
