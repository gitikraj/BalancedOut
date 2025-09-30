"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ExpenseForm } from "./components/expense-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ⬇️ shadcn/ui dialog (replace AntD Modal)
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/glassblur";

// Lazy-load the uploader to avoid SSR issues
const UploadImage = dynamic(() => import("./components/upload-image"), { ssr: false });

export default function NewExpensePage() {
  const router = useRouter();
  const [uploaderOpen, setUploaderOpen] = useState(false);

  const onUploadClick = (e) => {
    e.preventDefault();
    setUploaderOpen(true);
  };

  return (
    <div className="container max-w-3xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-5xl gradient-title">Add a new expense</h1>
        <p className="text-muted-foreground mt-1">
          Record a new expense to split with others
        </p>
      </div>

      <div>
        {/* Use type=button to avoid accidental form submits */}
        <Button type="button" onClick={onUploadClick}>
          Upload Image
        </Button>
      </div>

      <br />

      <Card>
        <CardContent>
          <Tabs className="pb-3" defaultValue="individual">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">Individual Expense</TabsTrigger>
              <TabsTrigger value="group">Group Expense</TabsTrigger>
            </TabsList>
            <TabsContent value="individual" className="mt-0">
              <ExpenseForm
                type="individual"
                onSuccess={(id) => router.push(`/person/${id}`)}
              />
            </TabsContent>
            <TabsContent value="group" className="mt-0">
              <ExpenseForm
                type="group"
                onSuccess={(id) => router.push(`/groups/${id}`)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog that shows the uploader and blurs background */}
      
      <Dialog open={uploaderOpen} onOpenChange={setUploaderOpen}>
        <DialogContent className="sm:max-w-[720px] p-0 max-h-[85vh]">
          {/* inner scroller */}
          <div className="max-h-[85vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle>Upload receipt</DialogTitle>
            </DialogHeader>
            <br />
            <UploadImage />
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
