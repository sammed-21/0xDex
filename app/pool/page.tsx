"use client";
import { PoolPositionsList } from "@/components/Pool/PoolDataDisply";
import { PoolList } from "@/components/Pool/PoolList";
import { PoolListHead } from "@/components/Pool/PoolListHead";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PoolPage() {
  return (
    <div className="w-full relative h-full mx-auto py-10 px-4 gap-4 flex flex-col items-start justify-center">
      <Tabs defaultValue="pools" className="w-full max-w-[1440px] mx-auto">
        <TabsList className="mb-4">
          <TabsTrigger value="pools">Pools</TabsTrigger>
          <TabsTrigger value="my-liquidity">My Liquidity</TabsTrigger>
        </TabsList>

        <TabsContent value="pools">
          <PoolListHead />
          <div className="w-full flex flex-col justify-center">
            <PoolList />
          </div>
        </TabsContent>

        <TabsContent value="my-liquidity">
          <PoolListHead />
          <div className="w-full flex flex-col justify-center">
            {/* Add your custom component or list for user's liquidity here */}
            {/* Example: <MyLiquidityList /> */}
            <PoolPositionsList />
            <p className="text-muted-foreground text-sm">
              You don’t have any liquidity positions yet.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
