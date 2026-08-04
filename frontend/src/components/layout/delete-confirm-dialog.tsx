import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type DeleteConfirmDialogProps = {
  open: boolean;
  itemName: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteConfirmDialog({
  open,
  itemName,
  description,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            {description ??
              `Remover “${itemName}”? Essa ação não pode ser desfeita.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant='destructive' onClick={onConfirm}>
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
