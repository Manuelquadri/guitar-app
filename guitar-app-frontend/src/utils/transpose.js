// src/utils/transpose.js

const SHARP_SCALE = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const FLAT_SCALE =  ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];

// Función para transponer una nota individual
function transposeNote(note, semitones) {
  // Encontrar la nota en ambas escalas para manejar bemoles y sostenidos
  const sharpIndex = SHARP_SCALE.indexOf(note);
  const flatIndex = FLAT_SCALE.indexOf(note);

  const currentIndex = sharpIndex > -1 ? sharpIndex : flatIndex;

  // Si la nota no está en nuestra escala (ej. un modificador como 'm' o '7'), no la cambiamos.
  if (currentIndex === -1) {
    return note;
  }
  
  // Calculamos el nuevo índice, asegurándonos de que sea un bucle (0-11)
  // La fórmula (a % n + n) % n maneja correctamente los números negativos en JS
  const newIndex = (currentIndex + semitones % 12 + 12) % 12;

  // Devolvemos la nota de la escala de sostenidos, que es más común para guitarra
  return SHARP_SCALE[newIndex];
}

// Función principal para transponer un acorde completo (ej. "G/B", "Am7")
function transposeChord(chord, semitones) {
  // Regex para separar la nota raíz de sus modificadores (m, 7, sus4, etc.)
  // y para manejar acordes con bajo alterado (ej. G/B)
  const chordRegex = /([A-G][#b]?)/g;

  return chord.replace(chordRegex, (match) => {
    return transposeNote(match, semitones);
  });
}

// Función que se exporta para ser usada en el componente de React
export function transposeSongContent(content, semitones) {
  // Si no hay transposición, devolvemos el contenido original para no hacer trabajo innecesario
  if (semitones === 0) {
    return content;
  }
  
  // Regex para encontrar todos los acordes dentro de las etiquetas <b>
  const tagRegex = /<b>(.*?)<\/b>/g;

  return content.replace(tagRegex, (fullMatch, chord) => {
    const transposedChord = transposeChord(chord, semitones);
    return `<b>${transposedChord}</b>`;
  });
}