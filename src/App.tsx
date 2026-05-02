import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vvfnrtjjqbzrhecideyz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Zm5ydGpqcWJ6cmhlY2lkZXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mzg4MzYsImV4cCI6MjA5MzMxNDgzNn0.2DPgCq3OJJlEB33mUr8KP3eVB7MCC02-zwPZTyjpFQQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Sighting {
  id: string;
  species_name: string;
  observed_at: string;
  notes: string | null;
}

export default function App() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("species_sightings")
      .select("id, species_name, observed_at, notes")
      .order("observed_at", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          setStatus("error");
        } else {
          setSightings(data || []);
          setStatus("ok");
        }
      });
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Hello from Sis 👋</h1>
      <p>
        Supabase backend:{" "}
        <a href={SUPABASE_URL} target="_blank" rel="noreferrer">
          {SUPABASE_URL}
        </a>
      </p>
      {status === "loading" && <p>Connecting to Supabase...</p>}
      {status === "error" && <p style={{ color: "red" }}>Error: {error}</p>}
      {status === "ok" && (
        <>
          <p style={{ color: "green" }}>
            ✓ Connected —{" "}
            {sightings.length === 0 ? "no sightings yet" : `${sightings.length} sighting(s)`}
          </p>
          {sightings.length > 0 && (
            <ul>
              {sightings.map((s) => (
                <li key={s.id}>
                  <strong>{s.species_name}</strong> —{" "}
                  {new Date(s.observed_at).toLocaleString()}
                  {s.notes && <span> ({s.notes})</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
