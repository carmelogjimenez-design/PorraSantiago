// Banco de preguntas del Trivial del Mundial.
// Para AMPLIAR: añade más objetos al array. answer = índice (0-3) de la opción correcta.
// Mantén siempre 4 opciones y verifica que la respuesta sea correcta.

export type Question = { q: string; options: [string, string, string, string]; answer: 0 | 1 | 2 | 3 };

export const QUESTIONS: Question[] = [
  // Campeones
  { q: "¿Qué selección ganó el Mundial de 2022 en Catar?", options: ["Francia", "Argentina", "Brasil", "Croacia"], answer: 1 },
  { q: "¿Quién ganó el Mundial de 2018 en Rusia?", options: ["Croacia", "Bélgica", "Francia", "Inglaterra"], answer: 2 },
  { q: "¿Qué país se proclamó campeón en Brasil 2014?", options: ["Alemania", "Argentina", "Brasil", "Países Bajos"], answer: 0 },
  { q: "¿Quién ganó el Mundial de Sudáfrica 2010?", options: ["Países Bajos", "España", "Alemania", "Uruguay"], answer: 1 },
  { q: "¿Qué selección levantó la Copa en Alemania 2006?", options: ["Francia", "Italia", "Alemania", "Portugal"], answer: 1 },
  { q: "¿Quién ganó el Mundial de Corea-Japón 2002?", options: ["Brasil", "Alemania", "Turquía", "Corea del Sur"], answer: 0 },
  { q: "¿Qué país ganó como anfitrión el Mundial de Francia 1998?", options: ["Brasil", "Croacia", "Francia", "Italia"], answer: 2 },
  { q: "¿Quién ganó el Mundial de Estados Unidos 1994?", options: ["Italia", "Brasil", "Suecia", "Bulgaria"], answer: 1 },
  { q: "¿Qué selección ganó Italia 1990?", options: ["Argentina", "Italia", "Alemania Occidental", "Inglaterra"], answer: 2 },
  { q: "¿Quién ganó el Mundial de México 1986?", options: ["Argentina", "Alemania Occidental", "Francia", "Brasil"], answer: 0 },
  { q: "¿Qué país ganó el primer Mundial de la historia, en 1930?", options: ["Argentina", "Brasil", "Uruguay", "Italia"], answer: 2 },
  { q: "¿Quién ganó el famoso Mundial de Inglaterra 1966?", options: ["Inglaterra", "Alemania Occidental", "Portugal", "Brasil"], answer: 0 },

  // Sedes
  { q: "¿Dónde se celebró el Mundial de 2010?", options: ["Sudáfrica", "Brasil", "Alemania", "Catar"], answer: 0 },
  { q: "¿Qué dos países coorganizaron el Mundial de 2002?", options: ["China y Japón", "Corea del Sur y Japón", "Corea del Sur y China", "Japón y Tailandia"], answer: 1 },
  { q: "¿En qué país se jugó el Mundial de 1986?", options: ["Argentina", "España", "México", "Estados Unidos"], answer: 2 },
  { q: "¿Dónde se disputó el Mundial de 1982?", options: ["Italia", "España", "Argentina", "Francia"], answer: 1 },
  { q: "¿Qué país albergará junto a EE. UU. y México el Mundial de 2026?", options: ["Solo EE. UU.", "Canadá", "Costa Rica", "Cuba"], answer: 1 },
  { q: "¿Cuántas selecciones participan en el Mundial de 2026?", options: ["32", "40", "48", "64"], answer: 2 },

  // Goleadores y récords
  { q: "¿Quién es el máximo goleador histórico de los Mundiales con 16 goles?", options: ["Ronaldo Nazário", "Miroslav Klose", "Gerd Müller", "Just Fontaine"], answer: 1 },
  { q: "¿Quién fue el máximo goleador del Mundial 2022?", options: ["Lionel Messi", "Kylian Mbappé", "Julián Álvarez", "Olivier Giroud"], answer: 1 },
  { q: "¿Qué jugador marcó un triplete en la final del Mundial 2022?", options: ["Lionel Messi", "Ángel Di María", "Kylian Mbappé", "Antoine Griezmann"], answer: 2 },
  { q: "¿Quién ganó la Bota de Oro del Mundial 2014 con 6 goles?", options: ["Thomas Müller", "Lionel Messi", "James Rodríguez", "Neymar"], answer: 2 },
  { q: "¿Qué país ha ganado más Mundiales (5)?", options: ["Alemania", "Italia", "Brasil", "Argentina"], answer: 2 },
  { q: "¿Cuántos Mundiales ganó Brasil?", options: ["3", "4", "5", "6"], answer: 2 },
  { q: "¿Qué jugador ha disputado más Mundiales como futbolista (5)?", options: ["Cristiano Ronaldo y Messi", "Lothar Matthäus y Rafa Márquez", "Buffon", "Maldini"], answer: 1 },

  // Anécdotas y momentos míticos
  { q: "¿A quién marcó Maradona el gol de la 'Mano de Dios' en 1986?", options: ["Brasil", "Inglaterra", "Alemania", "Bélgica"], answer: 1 },
  { q: "¿Qué hizo Zidane en la final de 2006 que acabó con su expulsión?", options: ["Un penalti fallado", "Un cabezazo a Materazzi", "Una mano", "Una falta al árbitro"], answer: 1 },
  { q: "¿Cómo se llamó el polémico 'Maracanazo' de 1950?", options: ["Brasil perdió la final en casa ante Uruguay", "Un gol fantasma", "Una final suspendida", "Un empate a cero"], answer: 0 },
  { q: "¿Quién falló el penalti decisivo de Italia en la final de 1994?", options: ["Franco Baresi", "Roberto Baggio", "Paolo Maldini", "Demetrio Albertini"], answer: 1 },
  { q: "¿Qué selección protagonizó el 'milagro' al ganar 1-0 a Alemania en la final de 1954?", options: ["Hungría", "Austria", "Alemania Occidental", "Uruguay"], answer: 2 },
  { q: "¿Con qué resultado ganó Alemania a Brasil en semifinales de 2014?", options: ["5-0", "7-1", "4-1", "6-1"], answer: 1 },
  { q: "¿Qué país eliminó a España en octavos del Mundial 2018 (por penaltis)?", options: ["Portugal", "Marruecos", "Rusia", "Croacia"], answer: 2 },
  { q: "¿Qué selección fue la gran sorpresa al llegar a semifinales en 2022?", options: ["Marruecos", "Senegal", "Japón", "Australia"], answer: 0 },

  // Trofeo, mascotas y curiosidades
  { q: "¿Cómo se llama el trofeo que se entrega al campeón desde 1974?", options: ["Copa Jules Rimet", "Copa Mundial de la FIFA", "Copa de Oro", "Trofeo Pelé"], answer: 1 },
  { q: "¿Qué selección ganó tres veces y se quedó la antigua Copa Jules Rimet?", options: ["Italia", "Brasil", "Alemania", "Uruguay"], answer: 1 },
  { q: "¿Cada cuántos años se celebra la Copa del Mundo?", options: ["Cada 2 años", "Cada 3 años", "Cada 4 años", "Cada 5 años"], answer: 2 },
  { q: "¿Quién es el único portero que ha ganado el Balón de Oro de un Mundial?", options: ["Lev Yashin", "Oliver Kahn", "Iker Casillas", "Gianluigi Buffon"], answer: 1 },
  { q: "¿Qué jugador marcó 4 goles en una final de Mundial (1958, con 17 años destacó)?", options: ["Pelé", "Garrincha", "Vavá", "Didí"], answer: 0 },
  { q: "¿En qué Mundial debutó Pelé, ganándolo con solo 17 años?", options: ["1954", "1958", "1962", "1966"], answer: 1 },
  { q: "¿Qué país africano fue el primero en llegar a cuartos de final (1990)?", options: ["Nigeria", "Camerún", "Senegal", "Ghana"], answer: 1 },
  { q: "¿Qué selección perdió tres finales seguidas en los 70-80 antes de ganar?", options: ["Países Bajos", "Alemania Occidental", "Argentina", "Hungría"], answer: 1 },
  { q: "¿Quién marcó el gol más rápido en la historia de los Mundiales (11 segundos, 2002)?", options: ["Hakan Şükür", "Ronaldo", "Rivaldo", "Oliver Bierhoff"], answer: 0 },
  { q: "¿Qué país ganó su primer Mundial en 1998 siendo anfitrión?", options: ["Francia", "Italia", "España", "Inglaterra"], answer: 0 },
  { q: "¿Quién fue el capitán de Argentina campeona en 2022?", options: ["Ángel Di María", "Lionel Messi", "Nicolás Otamendi", "Rodrigo De Paul"], answer: 1 },
  { q: "¿Contra quién jugó Argentina la final de 2022?", options: ["Croacia", "Marruecos", "Francia", "Brasil"], answer: 2 },
  { q: "¿Cómo terminó el tiempo reglamentario + prórroga de la final de 2022?", options: ["2-2", "3-3", "1-1", "4-4"], answer: 1 },
  { q: "¿Qué país europeo ganó su primer Mundial en 2010?", options: ["Países Bajos", "España", "Portugal", "Bélgica"], answer: 1 },
  { q: "¿En qué Mundial se usó por primera vez el VAR?", options: ["2014", "2018", "2022", "2010"], answer: 1 },
  { q: "¿Qué jugador ganó el Balón de Oro al mejor jugador del Mundial 2022?", options: ["Kylian Mbappé", "Lionel Messi", "Luka Modrić", "Antoine Griezmann"], answer: 1 },
  { q: "¿Qué selección ganó el Mundial de 1978 como anfitriona?", options: ["Brasil", "Países Bajos", "Argentina", "Italia"], answer: 2 },
  { q: "¿Quién eliminó a Brasil en cuartos del Mundial 2006?", options: ["Francia", "Italia", "Alemania", "Portugal"], answer: 0 },
];
