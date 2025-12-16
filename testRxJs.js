const { Subject } = require("rxjs");
const { bufferCount, filter } = require("rxjs/operators");

// Create a Subject to represent the stream of incoming numbers
const numberStream = new Subject();

// Function to simulate adding a new number and dropping the oldest
let numberArray = [];
const maxSize = 10; // Keep only the last 10 numbers

function addNumber(newNumber) {
  numberArray.push(newNumber); // Add new number
  if (numberArray.length > maxSize) {
    numberArray.shift(); // Drop the oldest number
  }
  numberStream.next(newNumber); // Emit the new number to the stream
  console.log("Current array:", numberArray);
}

// Subscribe to the stream with a rolling window of 10 numbers
numberStream
  .pipe(
    bufferCount(10, 1), // Collect 10 numbers, slide window by 1
    filter((window) => window.every((num) => num <= 50.0)) // Filter windows where all numbers are <= 50.0
  )
  .subscribe({
    next: (window) => {
      console.log("Event triggered: 10 consecutive numbers <= 50.0:", window);
    },
    error: (err) => console.error("Error:", err),
    complete: () => console.log("Stream completed"),
  });

// Simulate the process adding numbers over time
const sampleNumbers = [
  45.5,
  30.2,
  49.8,
  51.1,
  40.3,
  25.7,
  33.4,
  48.9,
  50.0,
  42.1, // First 10, 9 are <= 50
  44.2,
  47.3,
  39.6,
  41.8,
  50.0,
  45.6,
  32.4,
  49.9,
  38.7,
  46.2, // Next 10, all <= 50
  60.1,
  45.5,
  30.2,
];

let index = 0;
const interval = setInterval(() => {
  if (index < sampleNumbers.length) {
    addNumber(sampleNumbers[index]);
    index++;
  } else {
    clearInterval(interval); // Stop when all numbers are processed
    numberStream.complete(); // Signal stream completion
  }
}, 1000); // Add a new number every second
