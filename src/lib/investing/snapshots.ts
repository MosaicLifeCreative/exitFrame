import { prisma } from "@/lib/prisma";

export async function takePortfolioSnapshots(): Promise<{ user: boolean; ai: boolean }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const quotes = await prisma.stockQuote.findMany();
  const quoteMap = new Map(quotes.map((q) => [q.ticker, Number(q.price)]));

  const result = { user: false, ai: false };

  // User portfolio snapshot
  try {
    const userHoldings = await prisma.portfolioHolding.findMany({ where: { isActive: true } });

    let holdingsValue = 0;
    for (const h of userHoldings) {
      const price = quoteMap.get(h.ticker);
      if (price) {
        holdingsValue += Number(h.shares) * price;
      } else {
        holdingsValue += Number(h.shares) * Number(h.avgCostBasis);
      }
    }

    await prisma.portfolioSnapshot.upsert({
      where: { portfolioType_snapshotDate: { portfolioType: "USER", snapshotDate: today } },
      create: {
        portfolioType: "USER",
        totalValue: holdingsValue,
        cashValue: 0, // User's cash isn't tracked in the app
        holdingsValue,
        positionCount: userHoldings.length,
        snapshotDate: today,
      },
      update: {
        totalValue: holdingsValue,
        holdingsValue,
        positionCount: userHoldings.length,
      },
    });
    result.user = true;
  } catch (err) {
    console.error("Failed to snapshot user portfolio:", err);
  }

  // AI portfolio snapshot
  try {
    const aiPortfolio = await prisma.aiPortfolio.findFirst({
      where: { isActive: true },
      include: { positions: true },
    });

    if (aiPortfolio) {
      let holdingsValue = 0;
      for (const p of aiPortfolio.positions) {
        const price = quoteMap.get(p.ticker);
        if (price) {
          holdingsValue += Number(p.shares) * price;
        } else {
          holdingsValue += Number(p.shares) * Number(p.avgCostBasis);
        }
      }

      const cashValue = Number(aiPortfolio.cashBalance);
      const totalValue = cashValue + holdingsValue;

      await prisma.portfolioSnapshot.upsert({
        where: { portfolioType_snapshotDate: { portfolioType: "AI", snapshotDate: today } },
        create: {
          portfolioType: "AI",
          totalValue,
          cashValue,
          holdingsValue,
          positionCount: aiPortfolio.positions.length,
          snapshotDate: today,
        },
        update: {
          totalValue,
          cashValue,
          holdingsValue,
          positionCount: aiPortfolio.positions.length,
        },
      });
      result.ai = true;
    }
  } catch (err) {
    console.error("Failed to snapshot AI portfolio:", err);
  }

  return result;
}
