"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Library } from "lucide-react";
import Image from "next/image";
import Dashboard from "./dashboard";
import { PageLibrary } from "@/modules/data-library/notion-like-data-library";
import { AppearanceMenu } from "@/modules/dashboard/components/appearance-menu";
import { ChromeTabs } from "@/modules/dashboard/components/chrome-tabs";

export function AppShell() {
  const [activeMainTab, setActiveMainTab] = useState("productivity");

  return (
    <div className="flex h-screen flex-col overflow-x-auto overflow-y-hidden" style={{ width: '100vw', minWidth: '1200px' }}>
      <Tabs 
        defaultValue="productivity" 
        className="flex h-full flex-col"
        onValueChange={setActiveMainTab}
      >
        <div className="flex-shrink-0 bg-background">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image 
                src="/icon.svg" 
                alt="Panelaris Logo" 
                width={24} 
                height={24}
                className="dark:invert"
              />
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
            </div>
            <AppearanceMenu />
          </div>
          {activeMainTab === "productivity" && (
            <div className="px-4 sm:px-6 pb-0 border-b border-border">
              <ChromeTabs context="productivity" />
            </div>
          )}
          {activeMainTab === "data-library" && (
            <div className="px-4 sm:px-6 pb-0 border-b border-border">
              <ChromeTabs context="data-library" />
            </div>
          )}
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

