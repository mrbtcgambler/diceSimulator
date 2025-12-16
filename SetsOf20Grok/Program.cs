using System;
using System.Collections.Generic;
using System.Linq;

class Program
{
    static void Main()
    {
        const int totalNumbers = 1_000_000;
        const int setSize = 20;

        // Generate array of 1,000,000 random numbers (0.00 to 100.00)
        var arr = new double[totalNumbers];
        for (int i = 0; i < totalNumbers; i++)
        {
            arr[i] = Math.Round(Random.Shared.NextDouble() * 100, 2);
        }

        // Initialize tracking variables
        int unWins = 0;
        int ovWins = 0;
        int ties = 0;
        int maxCountUntilNextLoser = 0;
        var countUntilNextLoserFreq = new Dictionary<int, int>();

        // Output CSV header
        Console.WriteLine("Index|UN50|OV50|Winner|Next Loser Index|Count Until Next Loser");

        // Process array in sets of 20
        for (int i = 0; i < arr.Length; i += setSize)
        {
            int currentSetSize = Math.Min(setSize, arr.Length - i);
            var set = new Span<double>(arr, i, currentSetSize);

            // Count UN50 (<= 50.00) and OV50 (> 50.00)
            int un50Count = 0;
            int ov50Count = 0;
            foreach (var num in set)
            {
                if (num <= 50.0) un50Count++;
                else ov50Count++;
            }

            // Determine winner
            string winner = "TIE";
            if (un50Count > ov50Count)
            {
                winner = "UN";
                unWins++;
            }
            else if (ov50Count > un50Count)
            {
                winner = "OV";
                ovWins++;
            }
            else
            {
                ties++;
            }

            // Find index of next loser
            int nextLoserIndex = -1;
            int countUntilNextLoser = 0;

            if (winner != "TIE")
            {
                double loserValue = winner == "UN" ? 50.01 : 50.0;
                Func<double, bool> comparison = winner == "UN"
                    ? x => x > loserValue
                    : x => x <= loserValue;

                for (int j = i + setSize; j < arr.Length; j++)
                {
                    countUntilNextLoser++;
                    if (comparison(arr[j]))
                    {
                        nextLoserIndex = j;
                        break;
                    }
                }

                // Update max count and frequency
                if (countUntilNextLoser > maxCountUntilNextLoser)
                {
                    maxCountUntilNextLoser = countUntilNextLoser;
                }

                if (!countUntilNextLoserFreq.TryAdd(countUntilNextLoser, 1))
                {
                    countUntilNextLoserFreq[countUntilNextLoser]++;
                }
            }

            // Output CSV row
            Console.WriteLine($"{i}|{un50Count}|{ov50Count}|{winner}|{nextLoserIndex}|{countUntilNextLoser}");
        }

        // Output summary
        Console.WriteLine("\n=== Summary ===");
        Console.WriteLine($"Total Sets Processed: {Math.Ceiling((double)arr.Length / setSize)}");
        Console.WriteLine($"UN Wins: {unWins}");
        Console.WriteLine($"OV Wins: {ovWins}");
        Console.WriteLine($"Ties: {ties}");
        Console.WriteLine($"Maximum Count Until Next Loser: {maxCountUntilNextLoser}");
        Console.WriteLine("Frequency of Count Until Next Loser:");

        // Sort and display frequency in ascending order of count
        var sortedFreq = countUntilNextLoserFreq.OrderBy(kv => kv.Key);
        int totalFrequencySum = 0;
        foreach (var kv in sortedFreq)
        {
            Console.WriteLine($"  Count {kv.Key}: {kv.Value} times");
            totalFrequencySum += kv.Value;
        }
        Console.WriteLine($"Sum of Frequency Counts: {totalFrequencySum}");
    }
}