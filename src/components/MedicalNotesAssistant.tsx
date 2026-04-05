import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stethoscope, Loader2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PROMPT_TEMPLATE = (level: string, focus: string, length: string, input: string) =>
  `You are an expert medical educator helping a medical student study efficiently.

Difficulty Level: ${level}
Study Focus: ${focus}
Output Length: ${length}

Convert the following notes into:
1. Summary
2. Key Points
3. Flashcards

INPUT:
${input}`;

const MedicalNotesAssistant = () => {
  const [notes, setNotes] = useState("");
  const [difficulty, setDifficulty] = useState("Basic");
  const [focus, setFocus] = useState("Quick Revision");
  const [length, setLength] = useState("Concise");
  const [apiKey, setApiKey] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!notes.trim()) {
      toast({ title: "Please enter medical notes", variant: "destructive" });
      return;
    }
    if (!apiKey.trim()) {
      toast({ title: "Please enter your OpenAI API key", variant: "destructive" });
      return;
    }

    setLoading(true);
    setOutput("");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: PROMPT_TEMPLATE(difficulty, focus, length, notes),
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      setOutput(data.choices?.[0]?.message?.content || "No response received.");
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to generate study material",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Stethoscope className="h-4 w-4" />
            AI-Powered
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Medical Notes Assistant
          </h1>
          <p className="text-muted-foreground">
            Paste your notes and get AI-generated study materials instantly.
          </p>
        </div>

        {/* API Key */}
        <Card className="animate-fade-in">
          <CardContent className="pt-5">
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              OpenAI API Key
            </label>
            <input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Your key is stored locally and never sent to our servers.
            </p>
          </CardContent>
        </Card>

        {/* Notes Input */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Medical Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste your medical notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[180px] resize-y"
            />
          </CardContent>
        </Card>

        {/* Options */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Difficulty Level</label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Basic">Basic</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Study Focus</label>
            <Select value={focus} onValueChange={setFocus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Quick Revision">Quick Revision</SelectItem>
                <SelectItem value="Deep Understanding">Deep Understanding</SelectItem>
                <SelectItem value="Clinical Reasoning">Clinical Reasoning</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Output Length</label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Concise">Concise</SelectItem>
                <SelectItem value="Moderate">Moderate</SelectItem>
                <SelectItem value="Detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          className="w-full h-12 text-base font-semibold animate-fade-in"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <BookOpen className="mr-2 h-5 w-5" />
              Generate Study Material
            </>
          )}
        </Button>

        {/* Output */}
        {output && (
          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Study Material</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {output}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MedicalNotesAssistant;
