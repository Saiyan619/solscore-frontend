import { DashboardLayout } from "@/components/DashboardLayout";
import { useGetAllMarkets } from "@/program-hooks/get-market";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { BetCard } from "./components/BetCard";
import { useGetUserBets } from "@/program-hooks/get-bets";

const Bets = () => {
  const { bets, isPending: betsLoading } = useGetUserBets();
  const { markets, isLoading: marketsLoading } = useGetAllMarkets();

  // Create a map of market public keys to market data
  const marketMap = useMemo(() => {
    const map = new Map();
    markets.forEach((market) => {
      map.set(market.publicKey, market);
    });
    return map;
  }, [markets]);

  // Process bets with market data
  const processedBets = useMemo(() => {
    return bets
      .map((bet) => {
        const marketPubKey = bet.account.market.toString();
        const market = marketMap.get(marketPubKey);
        
        // Skip bets with deleted markets
        if (!market) return null;
        
        // Convert BN values to numbers
        const amount = typeof bet.account.amount === 'object' && 'toNumber' in bet.account.amount
          ? bet.account.amount.toNumber() / 1_000_000
          : 0;

        // Get the odds for this team
        const odds = market.account.odds[bet.account.teamIndex];
        const oddsDecimal = typeof odds === 'object' && 'toNumber' in odds
          ? odds.toNumber() / 100
          : odds / 100;

        // Calculate correct payout: stake * odds
        const payoutAmount = amount * oddsDecimal;

        const timestamp = typeof bet.account.timestamp === 'object' && 'toNumber' in bet.account.timestamp
          ? bet.account.timestamp.toNumber()
          : 0;

        return {
          publicKey: bet.publicKey,
          amount,
          payoutAmount,
          timestamp,
          teamIndex: bet.account.teamIndex,
          marketPublicKey: marketPubKey,
          market: {
            publicKey: market.publicKey,
            account: {
              leagueName: market.account.leagueName,
              season: market.account.season,
              teams: market.account.teams,
              isResolved: market.account.isResolved,
              winningTeamIndex: market.account.winningTeamIndex,
            }
          },
        };
      })
      .filter((bet): bet is NonNullable<typeof bet> => bet !== null);
  }, [bets, marketMap]);

  if (betsLoading || marketsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading your bets...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Bets</h1>
          <p className="text-muted-foreground">
            Track all your league championship predictions
          </p>
        </div>

        {processedBets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No bets found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedBets.map((bet) => (
              <BetCard key={bet.publicKey} {...bet} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Bets;