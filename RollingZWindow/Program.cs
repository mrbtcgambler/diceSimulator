using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace GuessingGameSafeBetting
{
    class Program
    {
        static void Main(string[] args)
        {
            // === PARSE COMMAND-LINE ARGUMENTS ===
            int trialCount = 3000;      // default
            double initialBankroll = 50.0; // default

            if (args.Length >= 1 && int.TryParse(args[0], out int t))
                trialCount = Math.Max(1, t);

            if (args.Length >= 2 && double.TryParse(args[1], out double b))
                initialBankroll = Math.Max(0.01, b);

            Console.WriteLine($"Starting simulation: {trialCount} trials | Bankroll: {initialBankroll:C2}\n");
            RunSimulation(trialCount, initialBankroll);
        }

        static void RunSimulation(int trialCount, double initialBankroll)
        {
            Random rand = new Random();
            var outcomes = new List<(double value, string label)>();
            var modes = new List<ModeReport>();
            var bets = new List<BetRecord>();

            // === SETTINGS ===
            const int windowSize = 30;
            const double zThresholdEnter = 2.0;
            const double zThresholdBet = 2.5;
            const int reversalDiff = 5;
            const int maxTrialsWithoutReversal = 100;
            const double kellyMultiplier = 0.025;
            const double maxKellyFraction = 0.05;
            const double minBet = 0.01;
            const double profitTargetMultiplier = 3.0;
            const double drawdownStop = 0.5;
            const double modeLossCap = 0.01;

            double bankroll = initialBankroll;
            double peakBankroll = bankroll;
            double modeStartBankroll = bankroll;

            Mode currentMode = null;
            int? modeStartTrial = null;
            int ovInSyncCount = 0;
            int unInAntiSyncCount = 0;
            int maxContinuationInMode = 0;
            int continuationStreak = 0;

            for (int trial = 1; trial <= trialCount; trial++)
            {
                // === PROFIT TARGET QUIT ===
                if (bankroll >= initialBankroll * profitTargetMultiplier)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine($"[PROFIT TARGET] {bankroll:C2} → QUIT");
                    Console.ResetColor();
                    break;
                }

                double number = rand.NextDouble() * 100.0;
                string label = number <= 50.00 ? "UN" : "OV";
                outcomes.Add((number, label));
                if (outcomes.Count > windowSize) outcomes.RemoveAt(0);

                if (outcomes.Count != windowSize) continue;

                // === RECALCULATE Z-SCORE ===
                int ovCount = outcomes.Count(o => o.label == "OV");
                int unCount = windowSize - ovCount;
                double p = 0.5;
                double expected = windowSize * p;
                double stdDev = Math.Sqrt(windowSize * p * (1 - p));
                double currentZ = (ovCount - expected) / stdDev;

                bool shouldEnterSync = currentZ >= zThresholdEnter;
                bool shouldEnterAntiSync = currentZ <= -zThresholdEnter;

                // === MODE ENTRY ===
                if (currentMode == null)
                {
                    if (shouldEnterSync)
                    {
                        currentMode = new Mode { Type = "SYNC", StartTrial = trial, ZScore = currentZ };
                        modeStartTrial = trial;
                        modeStartBankroll = bankroll;
                        ovInSyncCount = 0;
                        maxContinuationInMode = 0;
                        continuationStreak = 0;
                        EnterModeOutput(trial, "SYNC", currentZ);
                    }
                    else if (shouldEnterAntiSync)
                    {
                        currentMode = new Mode { Type = "ANTI-SYNC", StartTrial = trial, ZScore = currentZ };
                        modeStartTrial = trial;
                        modeStartBankroll = bankroll;
                        unInAntiSyncCount = 0;
                        maxContinuationInMode = 0;
                        continuationStreak = 0;
                        EnterModeOutput(trial, "ANTI-SYNC", currentZ);
                    }
                }
                else
                {
                    currentMode.ZScore = currentZ;
                    int trialsInMode = trial - modeStartTrial.Value;
                    string betSide = currentMode.Type == "SYNC" ? "OV" : "UN";

                    // === DRAWDOWN STOP ===
                    if (bankroll < peakBankroll * drawdownStop)
                    {
                        Console.ForegroundColor = ConsoleColor.DarkRed;
                        Console.WriteLine($"[EMERGENCY STOP] Bankroll: {bankroll:C2}");
                        Console.ResetColor();
                        break;
                    }

                    // === MODE LOSS CAP ===
                    if (bankroll < modeStartBankroll * (1 - modeLossCap))
                    {
                        EndModeAndReset(trial, trialsInMode, "loss cap", maxContinuationInMode, ref currentMode, ref modeStartTrial,
                                        ref ovInSyncCount, ref unInAntiSyncCount, ref maxContinuationInMode, ref continuationStreak, modes);
                        continue;
                    }

                    // === BET ON STRONG Z ===
                    if (Math.Abs(currentZ) >= zThresholdBet)
                    {
                        double fraction = Math.Min(Math.Abs(currentZ) * kellyMultiplier, maxKellyFraction);
                        double betSize = Math.Max(bankroll * fraction, minBet);
                        betSize = Math.Round(betSize, 2);

                        bool won = label == betSide;
                        double pnl = won ? betSize : -betSize;
                        bankroll += pnl;
                        peakBankroll = Math.Max(peakBankroll, bankroll);

                        bets.Add(new BetRecord
                        {
                            Trial = trial,
                            Mode = currentMode.Type,
                            ZScore = currentZ,
                            BetSide = betSide,
                            BetSize = betSize,
                            Outcome = label,
                            Won = won,
                            PnL = pnl,
                            Bankroll = bankroll
                        });

                        Console.ForegroundColor = won ? ConsoleColor.Cyan : ConsoleColor.Magenta;
                        Console.WriteLine($"[BET {trial,5}] {betSide} @ {betSize,7:C} → {(won ? "WIN" : "LOSS")} | Bankroll: {bankroll,8:C}");
                        Console.ResetColor();
                    }

                    // === CONTINUATION STREAK ===
                    bool isContinuation = (currentMode.Type == "SYNC" && label == "OV") ||
                                          (currentMode.Type == "ANTI-SYNC" && label == "UN");
                    if (isContinuation)
                    {
                        continuationStreak++;
                        maxContinuationInMode = Math.Max(maxContinuationInMode, continuationStreak);
                    }
                    else
                    {
                        continuationStreak = 0;
                    }

                    // === REVERSAL ===
                    int diff = currentMode.Type == "SYNC" ? unCount - ovCount : ovCount - unCount;
                    if (diff >= reversalDiff)
                    {
                        EndModeAndReset(trial, trialsInMode, "reversal", maxContinuationInMode, ref currentMode, ref modeStartTrial,
                                        ref ovInSyncCount, ref unInAntiSyncCount, ref maxContinuationInMode, ref continuationStreak, modes);
                        continue;
                    }

                    // === TIMEOUT ===
                    if (trialsInMode >= maxTrialsWithoutReversal)
                    {
                        EndModeAndReset(trial, trialsInMode, "timeout", maxContinuationInMode, ref currentMode, ref modeStartTrial,
                                        ref ovInSyncCount, ref unInAntiSyncCount, ref maxContinuationInMode, ref continuationStreak, modes);
                    }
                }
            }

            // Final mode
            if (currentMode != null)
            {
                int trialsInMode = trialCount - modeStartTrial.Value;
                string reason = trialsInMode >= maxTrialsWithoutReversal ? "timeout" : "sim end";
                EndModeAndReset(trialCount, trialsInMode, reason, maxContinuationInMode, ref currentMode, ref modeStartTrial,
                                ref ovInSyncCount, ref unInAntiSyncCount, ref maxContinuationInMode, ref continuationStreak, modes);
            }

            PrintFinalReport(bankroll, initialBankroll, peakBankroll, bets, modes);
            ExportBetsToCsv(bets, "safe_bets.csv");
            Console.WriteLine("\nBet log: safe_bets.csv");
        }

        static void EnterModeOutput(int trial, string type, double z)
        {
            Console.ForegroundColor = type == "SYNC" ? ConsoleColor.Green : ConsoleColor.Red;
            Console.WriteLine($"[{trial,5}] >>> MODE START: {type} | z={z,5:F2} <<<");
            Console.ResetColor();
        }

        static void EndModeAndReset(int endTrial, int trials, string reason, int maxCont,
                                    ref Mode currentMode, ref int? modeStartTrial,
                                    ref int ovCount, ref int unCount, ref int maxContOut, ref int streak,
                                    List<ModeReport> modes)
        {
            modes.Add(new ModeReport
            {
                ModeType = currentMode.Type,
                StartTrial = currentMode.StartTrial,
                ZScore = currentMode.ZScore,
                EndTrial = endTrial,
                TrialsBeforeReversal = trials,
                EndReason = reason,
                MaxContinuation = maxCont
            });

            Console.ForegroundColor = currentMode.Type == "SYNC" ? ConsoleColor.Green : ConsoleColor.Red;
            Console.WriteLine($"[{endTrial,5}] <<< MODE END: {currentMode.Type} | {reason} >>>");
            Console.ResetColor();

            currentMode = null;
            modeStartTrial = null;
            if (currentMode?.Type == "SYNC") ovCount = 0; else unCount = 0;
            maxContOut = 0;
            streak = 0;
        }

        static void PrintFinalReport(double final, double initial, double peak, List<BetRecord> bets, List<ModeReport> modes)
        {
            int wins = bets.Count(b => b.Won);
            double winRate = bets.Count > 0 ? wins * 100.0 / bets.Count : 0;
            double roi = (final - initial) / initial * 100;
            double maxDD = peak > 0 ? (peak - final) / peak * 100 : 0;

            Console.WriteLine("\n" + new string('=', 90));
            Console.WriteLine("SAFE BETTING FINAL REPORT");
            Console.WriteLine(new string('=', 90));
            Console.WriteLine($"Initial:     {initial,12:C}");
            Console.WriteLine($"Final:       {final,12:C}");
            Console.WriteLine($"Peak:        {peak,12:C}");
            Console.WriteLine($"Return:      {final - initial,12:C} ({roi,6:F1}%)");
            Console.WriteLine($"Max DD:      {maxDD,12:F1}%");
            Console.WriteLine($"Bets:        {bets.Count,12}");
            Console.WriteLine($"Win Rate:    {winRate,12:F1}%");
            Console.WriteLine($"Modes:       {modes.Count,12}");
            Console.WriteLine(new string('=', 90));
        }

        static void ExportBetsToCsv(List<BetRecord> bets, string file)
        {
            var lines = new List<string> { "Trial,Mode,ZScore,BetSide,BetSize,Outcome,Won,PnL,Bankroll" };
            lines.AddRange(bets.Select(b =>
                $"{b.Trial},{b.Mode},{b.ZScore:F3},{b.BetSide},{b.BetSize:F2},{b.Outcome},{b.Won},{b.PnL:F2},{b.Bankroll:F2}"));
            File.WriteAllLines(file, lines);
        }
    }

    class Mode { public string Type; public int StartTrial; public double ZScore; }
    class ModeReport
    {
        public string ModeType; public int StartTrial; public double ZScore;
        public int EndTrial; public int TrialsBeforeReversal; public string EndReason; public int MaxContinuation;
    }
    class BetRecord
    {
        public int Trial; public string Mode; public double ZScore; public string BetSide;
        public double BetSize; public string Outcome; public bool Won; public double PnL; public double Bankroll;
    }
}