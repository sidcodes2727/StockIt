import { ArrowLeft, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { StockMeter } from "@/components/StockMeter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <p className="eyebrow justify-center">Error 404</p>
        <h1 className="font-display mt-4 text-[96px] font-extrabold leading-none tracking-[-0.06em] sm:text-[128px]">
          4<span className="text-primary">0</span>4
        </h1>

        {/* The meter, reading empty: nothing in stock at this address. */}
        <div className="mx-auto mt-6 max-w-[220px]">
          <StockMeter quantity={0} reorderLevel={10} status="out_of_stock" />
          <p className="num mt-2 text-[11px] text-muted-foreground">0 in stock at this address</p>
        </div>

        <p className="mt-6 text-[14px] leading-relaxed text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link to="/">
              <ArrowLeft />
              Back to dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/products">
              <Search />
              Browse products
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
