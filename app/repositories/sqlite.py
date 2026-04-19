import sqlite3
from flask import current_app


def get_db():
    conn = sqlite3.connect(current_app.config["APP_DATA_DB"])
    conn.row_factory = sqlite3.Row
    return conn


def init_appdata_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS betrieb (
            id INTEGER PRIMARY KEY,
            firma TEXT, name TEXT, vorname TEXT,
            strHnr TEXT, plz TEXT, ort TEXT,
            bundesland TEXT, guid TEXT
        );

        CREATE TABLE IF NOT EXISTS pflanzenschutzmittel (
            id INTEGER PRIMARY KEY,
            name TEXT, zulassungsnr TEXT,
            wirkstoffe TEXT,
            aufwandEinheit TEXT, bienen TEXT, lager_einheit TEXT,
            min_lager REAL DEFAULT 0, warnung_lager REAL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS einsatzorte (
            id INTEGER PRIMARY KEY,
            name TEXT, gpsRechtswert REAL,
            gpsHochwert REAL, anwendungsbereich TEXT,
            geoTyp TEXT, einheit TEXT, flaecheVolumen REAL, ort_id INTEGER NOT NULL REFERENCES orte (id)
        );
                    
        CREATE TABLE IF NOT EXISTS orte(
            id INTEGER PRIMARY KEY,
            name TEXT, plz INTEGER
        );

        CREATE TABLE IF NOT EXISTS kulturen (
            id INTEGER PRIMARY KEY,
            name TEXT, eppoCode TEXT
        );

        CREATE TABLE IF NOT EXISTS applikationen (
            id INTEGER PRIMARY KEY,
            created_at TEXT NOT NULL,
            datum TEXT,
            uhrzeit TEXT,
            artVerwendung TEXT,
            verantwortlich TEXT,
            anwender TEXT,
            einsatzorte TEXT,
            psm_namen TEXT,
            kulturen TEXT,
            json_data TEXT NOT NULL
        );
                    
        CREATE TABLE IF NOT EXISTS application_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
                    
        CREATE TABLE IF NOT EXISTS bbch_codes (
            id INTEGER PRIMARY KEY,
            kultur_id INTEGER NOT NULL REFERENCES kulturen (id),
            code TEXT,
            bezeichnung TEXT,
            beschreibung TEXT,
            sortierung INTEGER            
        );
        CREATE TABLE IF NOT EXISTS inventory_movements (
            id INTEGER PRIMARY KEY,
            psm_id INTEGER NOT NULL REFERENCES pflanzenschutzmittel (id),
            applikations_Id INTEGER REFERENCES applikationen (id),
            typ TEXT NOT NULL, menge REAL NOT NULL CHECK (menge>=0), einheit TEXT NOT NULL, datum TEXT NOT NULL CHECK (datum GLOB '????-??-??'), notiz TEXT,
            quelle TEXT, updated_at TEXT NOT NULL CHECK(datum GLOB '????-??-??'), created_at TEXT NOT NULL CHECK(datum GLOB '????-??-??')
        );  
        CREATE INDEX IF NOT EXISTS idx_inventory_movements_psm_id ON inventory_movements (psm_id);          
    """)
    conn.commit()
    c.execute("""
        INSERT OR IGNORE INTO application_settings (key, value)
        VALUES ('registration_allowed', '1')
    """)
    conn.commit()
    conn.close()
