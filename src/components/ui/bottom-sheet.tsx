import * as React from 'react';
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  snapPoints = ['300px', '500px', 1],
}: BottomSheetProps) {
  return (
    <Drawer.Root 
      open={open} 
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'bg-background rounded-t-[20px]',
            'flex flex-col max-h-[96%]',
            'focus:outline-none'
          )}
        >
          {/* Handle */}
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted my-4" />
          
          {/* Content */}
          <div className="flex-1 overflow-auto px-4 pb-8">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// Subcomponents for structured content
export function BottomSheetHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-4 border-b border-border">
      {children}
    </div>
  );
}

export function BottomSheetTitle({ children }: { children: React.ReactNode }) {
  return (
    <Drawer.Title className="text-lg font-semibold">
      {children}
    </Drawer.Title>
  );
}

export function BottomSheetDescription({ children }: { children: React.ReactNode }) {
  return (
    <Drawer.Description className="text-sm text-muted-foreground mt-1">
      {children}
    </Drawer.Description>
  );
}

export function BottomSheetFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-4 border-t border-border mt-auto">
      {children}
    </div>
  );
}
