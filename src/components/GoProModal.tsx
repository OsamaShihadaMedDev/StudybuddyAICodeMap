import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, Sparkles } from "lucide-react";

interface GoProModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GoProModal = ({ open, onOpenChange }: GoProModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl font-extrabold">Go Pro</DialogTitle>
          <div className="pt-1">
            <p className="text-2xl font-extrabold text-foreground">
              $4.99 <span className="text-sm font-medium text-muted-foreground">USD / month</span>
            </p>
          </div>
          <DialogDescription className="text-sm text-muted-foreground pt-2">
            Unlock unlimited study sheet and flashcard generations with the Pro
            monthly subscription. Pro access is granted manually — reach out on
            WhatsApp or Email and we'll activate your account within a few hours.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          <a
            href="https://wa.me/972592823030"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button className="w-full h-11 rounded-xl btn-gradient font-semibold gap-2">
              <MessageCircle className="h-4 w-4" />
              Message on WhatsApp
            </Button>
          </a>
          <a href="mailto:Osama200az@gmail.com" className="w-full">
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-semibold gap-2"
            >
              <Mail className="h-4 w-4" />
              Send an Email
            </Button>
          </a>
        </div>

        <p className="text-[11px] text-muted-foreground pt-1 opacity-70">
          Access is usually granted within a few hours.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default GoProModal;
