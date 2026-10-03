import { config } from "../config.js";
import { pool, query } from "./pool.js";

const CHEM_IMAGE =
  "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=200&h=200&fit=crop";

async function main() {
  await query("DELETE FROM questions");
  await query("DELETE FROM pod_reactions");
  await query("DELETE FROM pod_progress");
  await query("DELETE FROM pods");
  await query("DELETE FROM seed_audio_variants");
  await query("DELETE FROM learning_path_selections");
  await query("DELETE FROM learning_path_items");
  await query("DELETE FROM learning_paths");
  await query("DELETE FROM chapters");
  await query("DELETE FROM subjects");
  await query("DELETE FROM refresh_tokens");
  await query("DELETE FROM otp_codes");
  await query("DELETE FROM users");
  await query("DELETE FROM standards");

  const standards = [
    { code: "CBSE-11", name: "Class 11", board: "CBSE" },
    { code: "CBSE-12", name: "Class 12", board: "CBSE" },
  ];

  const stdIds: Record<string, string> = {};
  for (const s of standards) {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO standards (code, name, board) VALUES ($1,$2,$3) RETURNING id`,
      [s.code, s.name, s.board],
    );
    stdIds[s.code] = rows[0].id;
  }

  const chaptersBySubject: Record<
    string,
    { title: string; synopsis: string }[]
  > = {
    "CBSE-11": [
      {
        title: "Some Basic Concepts of Chemistry",
        synopsis: "Mole concept, stoichiometry, and significant figures.",
      },
      {
        title: "Structure of Atom",
        synopsis: "Bohr model, quantum numbers, electronic configuration.",
      },
      {
        title: "Chemical Bonding and Molecular Structure",
        synopsis: "VBT, VSEPR, hybridization, and molecular orbital theory.",
      },
      {
        title: "Thermodynamics",
        synopsis: "Enthalpy, entropy, Gibbs energy, and spontaneity.",
      },
      {
        title: "Equilibrium",
        synopsis: "Chemical and ionic equilibrium, Ka, Kb, and buffers.",
      },
    ],
    "CBSE-12": [
      {
        title: "Aldehydes, Ketones and Carboxylic Acids",
        synopsis: "Carbonyl chemistry, nucleophilic addition, and acidity.",
      },
      {
        title: "Alcohols, Phenols and Ethers",
        synopsis: "Preparation, properties, and reactions of oxygen compounds.",
      },
      {
        title: "Haloalkanes and Haloarenes",
        synopsis: "SN1/SN2 mechanisms and aromatic halogen compounds.",
      },
      {
        title: "Electrochemistry",
        synopsis: "Galvanic cells, Nernst equation, and conductance.",
      },
      {
        title: "Chemical Kinetics",
        synopsis: "Rate laws, order, molecularity, and Arrhenius equation.",
      },
    ],
  };

  for (const code of ["CBSE-11", "CBSE-12"] as const) {
    const { rows: subRows } = await query<{ id: string }>(
      `INSERT INTO subjects (standard_id, name, slug) VALUES ($1,$2,$3) RETURNING id`,
      [stdIds[code], "Chemistry", "chemistry"],
    );
    const subjectId = subRows[0].id;
    const chapterIds: string[] = [];

    for (const [i, ch] of chaptersBySubject[code].entries()) {
      const { rows } = await query<{ id: string }>(
        `INSERT INTO chapters (subject_id, title, synopsis, image_url, sort_order, source_count)
         VALUES ($1,$2,$3,$4,$5,1) RETURNING id`,
        [subjectId, ch.title, ch.synopsis, CHEM_IMAGE, i + 1],
      );
      chapterIds.push(rows[0].id);

      for (const hostCount of [2, 3, 4]) {
        await query(
          `INSERT INTO seed_audio_variants (chapter_id, host_count, audio_url, duration_sec, title)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            rows[0].id,
            hostCount,
            config.sampleAudioUrl,
            1482,
            `${ch.title.split(" ").slice(0, 3).join(" ")} · ${hostCount} hosts`,
          ],
        );
      }
    }

    const { rows: pathRows } = await query<{ id: string }>(
      `INSERT INTO learning_paths (subject_id, name, description)
       VALUES ($1,$2,$3) RETURNING id`,
      [
        subjectId,
        code === "CBSE-12" ? "Organic Core Path" : "Foundations Path",
        "Curated chapter order for steady revision.",
      ],
    );
    const { rows: path2 } = await query<{ id: string }>(
      `INSERT INTO learning_paths (subject_id, name, description)
       VALUES ($1,$2,$3) RETURNING id`,
      [
        subjectId,
        "Exam Sprint",
        "High-yield chapters first for board prep.",
      ],
    );

    for (const [i, chapterId] of chapterIds.entries()) {
      await query(
        `INSERT INTO learning_path_items (learning_path_id, chapter_id, position) VALUES ($1,$2,$3)`,
        [pathRows[0].id, chapterId, i + 1],
      );
      await query(
        `INSERT INTO learning_path_items (learning_path_id, chapter_id, position) VALUES ($1,$2,$3)`,
        [path2[0].id, chapterId, chapterIds.length - i],
      );
    }
  }

  await query(
    `INSERT INTO users (email, name, standard_id, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET role='admin', name=EXCLUDED.name`,
    ["admin@tutorpod.local", "Tutor Admin", stdIds["CBSE-12"]],
  );

  console.log("Seed complete: CBSE 11–12 Chemistry + audio variants + paths.");
  console.log("Admin: admin@tutorpod.local  OTP stub: 000000");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
