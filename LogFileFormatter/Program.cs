using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

class Program
{
    static void Main(string[] args)
    {
        const string lognumber = "005";
        const string inputFile = $"./data/chester-{lognumber}.log";
        const string outputFile = $"./data/dice-simulator-chester-{lognumber}-trials-48000.json";
        const int maxLines = 48000;
        const int chunkSize = 3000;

        try
        {
            // Check if input file exists
            if (!File.Exists(inputFile))
            {
                Console.WriteLine($"Error: Input file '{inputFile}' not found.");
                return;
            }

            // Ensure data directory exists
            Directory.CreateDirectory("./data");

            Console.WriteLine($"Reading file: {inputFile}");
            Console.WriteLine($"Processing first {maxLines} lines...");

            var allResults = new List<double>();
            var lines = File.ReadLines(inputFile).Take(maxLines).ToList();

            Console.WriteLine($"Found {lines.Count} lines to process.");

            // Parse all lines and extract Result values
            foreach (var line in lines)
            {
                var result = ExtractResult(line);
                if (result.HasValue)
                {
                    allResults.Add(result.Value);
                }
            }

            Console.WriteLine($"Extracted {allResults.Count} result values.");

            // Write main output file with all results
            var jsonOptions = new JsonSerializerOptions
            {
                WriteIndented = true
            };
            File.WriteAllText(outputFile, JsonSerializer.Serialize(allResults, jsonOptions));
            Console.WriteLine($"Created main output file: {outputFile}");

            // Create chunked files (3000 results per file)
            int chunkNumber = 0;
            for (int i = 0; i < allResults.Count; i += chunkSize)
            {
                var chunk = allResults.Skip(i).Take(chunkSize).ToList();
                int startRange = i + 1;
                int endRange = Math.Min(i + chunkSize, allResults.Count);

                string chunkFile = $"./data/dice-simulator-chester-{lognumber}-trials-{startRange:D4}-{endRange:D4}.json";
                File.WriteAllText(chunkFile, JsonSerializer.Serialize(chunk, jsonOptions));

                chunkNumber++;
                Console.WriteLine($"Created chunk file {chunkNumber}: {chunkFile} ({chunk.Count} results)");
            }

            Console.WriteLine("\nProcessing complete!");
            Console.WriteLine($"Total results extracted: {allResults.Count}");
            Console.WriteLine($"Total chunk files created: {chunkNumber}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }
    }

    static double? ExtractResult(string line)
    {
        try
        {
            // Split by '|' and find the part containing "Result: "
            var parts = line.Split('|');
            foreach (var part in parts)
            {
                var trimmed = part.Trim();
                if (trimmed.StartsWith("Result: "))
                {
                    var resultStr = trimmed.Substring("Result: ".Length).Trim();
                    if (double.TryParse(resultStr, out double result))
                    {
                        return result;
                    }
                }
            }
        }
        catch
        {
            // Skip lines that can't be parsed
        }
        return null;
    }
}