"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Library } from "lucide-react";
import Dashboard from "./dashboard";
import { PageLibrary } from "@/modules/data-library/notion-like-data-library";
import { AppearanceMenu } from "@/modules/dashboard/components/appearance-menu";

export function AppShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Tabs defaultValue="productivity" className="flex h-full flex-col">
        <div className="flex-shrink-0 border-b border-border bg-background px-6 py-3 flex items-center justify-between">
          <TabsList className="w-fit">
            <TabsTrigger value="productivity" className="gap-2">
              <LayoutDashboard className="size-4" />
              Productivity
            </TabsTrigger>
            <TabsTrigger value="data-library" className="gap-2">
              <Library className="size-4" />
              Data Library
            </TabsTrigger>
          </TabsList>
          <AppearanceMenu />
        </div>
        <TabsContent value="productivity" className="flex-1 overflow-hidden m-0">
          <Dashboard />
        </TabsContent>
        <TabsContent value="data-library" className="flex-1 overflow-hidden m-0">
          <PageLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}

