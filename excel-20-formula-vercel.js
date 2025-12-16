// Generate Excel COUNTIF formulas with iterating ranges
function generateCountifFormulas() {
  const formulas = [];

  // Starting range: $C$4042:$C$4061
  let startRow = 2582;
  let endRow = 2601;

  // Target end: $C$9982:$C$10001
  const targetEndRow = 10001;
  //   const targetEndRow = 5001;

  console.log("Generating Excel COUNTIF formulas...\n");

  while (endRow <= targetEndRow) {
    const formula = `=COUNTIF($C$${startRow}:$C$${endRow},"=UN")`;
    formulas.push(formula);

    // console.log(`Range ${formulas.length}: ${formula}`);

    // Increment by 20 for next iteration
    startRow += 20;
    endRow += 20;
  }

  console.log(`\nGenerated ${formulas.length} formulas total.`);
  console.log(`First formula: ${formulas[0]}`);
  console.log(`Last formula: ${formulas[formulas.length - 1]}`);

  return formulas;
}

// Generate and export the formulas
const formulas = generateCountifFormulas();

// Optional: Save to a text file format that can be easily copied to Excel
console.log("\n--- All Formulas (copy-paste ready) ---");
formulas.forEach((formula, index) => {
  console.log(`${formula}\n`);
});
