import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Zap, Clock, CheckCircle, AlertCircle, Image as ImageIcon, Link as LinkIcon, Paperclip, X, FileText, Camera, Upload } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface PayPageProps {
  exchangeRate: number;
  availableUsdt: number;
  onBack: () => void;
  onSubmit: (data: PaymentDraft) => void;
  draft: PaymentDraft | null;
  onDraftChange: (draft: PaymentDraft | null) => void;
}

export interface PaymentDraft {
  step: 1 | 2 | 3 | 4 | 5;
  amountRub: number;
  amountUsdt: number;
  frozenRate: number;
  urgency: 'urgent' | 'standard';
  hasUrgentFee: boolean;
  attachments: Array<{type: 'image' | 'link' | 'pdf' | 'doc' | 'docx'; value: string; name?: string}>;
  comment: string;
}

export default function PayPage({ exchangeRate, availableUsdt, onBack, onSubmit, draft, onDraftChange }: PayPageProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(draft?.step || 1);
  const [amountRub, setAmountRub] = useState(draft?.amountRub?.toString() || '');
  const [frozenRate, setFrozenRate] = useState(draft?.frozenRate || 0);
  const [urgency, setUrgency] = useState<'urgent' | 'standard'>(draft?.urgency || 'standard');
  const [attachments, setAttachments] = useState<Array<{type: 'image' | 'link' | 'pdf' | 'doc' | 'docx'; value: string; name?: string}>>(draft?.attachments || []);
  const [comment, setComment] = useState(draft?.comment || '');
  const [linkInput, setLinkInput] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Lock exchange rate when entering step 1
  useEffect(() => {
    if (step === 1 && frozenRate === 0) {
      setFrozenRate(exchangeRate);
    }
  }, [step, exchangeRate, frozenRate]);
  
  const availableRub = availableUsdt * exchangeRate;
  const numAmount = Number(amountRub);
  
  // Use frozen rate for all calculations
  const rateToUse = frozenRate > 0 ? frozenRate : exchangeRate;
  
  // Calculate USDT freeze amount according to requirements:
  // Standard urgency: usdtToFreeze = sum_rub / frozenRate
  // Urgent urgency: usdtToFreeze = (sum_rub / frozenRate) * 1.005
  const baseUsdt = numAmount / rateToUse;
  const usdtToFreeze = urgency === 'urgent' 
    ? baseUsdt * 1.005       // Urgent: +0.5% fee
    : baseUsdt;              // Standard: no fee
  
  // Round to 8 decimal places
  const amountUsdt = Number(usdtToFreeze.toFixed(8));

  const hasMinError = numAmount > 0 && numAmount < 3000;
  const hasMaxError = numAmount > 100000;
  const hasInsufficientFunds = numAmount > availableRub;

  useEffect(() => {
    if (step >= 1 && step <= 4) {
      onDraftChange({
        step,
        amountRub: numAmount,
        amountUsdt,
        frozenRate: frozenRate || exchangeRate,
        urgency,
        hasUrgentFee: urgency === 'urgent',
        attachments,
        comment,
      });
    }
  }, [step, numAmount, amountUsdt, frozenRate, urgency, attachments, comment]);

  const handleNext = () => {
    if (step === 1) {
      if (numAmount >= 3000 && numAmount <= 100000 && !hasInsufficientFunds) {
        setFrozenRate(exchangeRate);
        setStep(2);
      }
    } else if (step === 2) setStep(3);
    else if (step === 3) setStep(4);
  };

  const handleBack = () => {
    if (step === 1) {
      onDraftChange(null);
      onBack();
    } else if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
  };

  const handleSubmit = () => {
    const finalData: PaymentDraft = {
      step: 5,
      amountRub: numAmount,
      amountUsdt,
      frozenRate,
      urgency,
      hasUrgentFee: urgency === 'urgent',
      attachments,
      comment,
    };
    onSubmit(finalData);
    setStep(5);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleCapturePhoto = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryPhoto = () => {
    galleryInputRef.current?.click();
  };

  const handleUploadDocument = () => {
    documentInputRef.current?.click();
  };

  const handleCameraFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Файл слишком большой",
        description: "Максимальный размер файла — 5 МБ",
        variant: "destructive",
      });
      return;
    }

    try {
      const base64 = await convertFileToBase64(file);
      setAttachments([...attachments, { 
        type: 'image', 
        value: base64, 
        name: file.name 
      }]);
      e.target.value = '';
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обработать фото",
        variant: "destructive",
      });
    }
  };

  const handleGallerySelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Файл слишком большой",
        description: "Максимальный размер файла — 5 МБ",
        variant: "destructive",
      });
      return;
    }

    try {
      const base64 = await convertFileToBase64(file);
      setAttachments([...attachments, { 
        type: 'image', 
        value: base64, 
        name: file.name 
      }]);
      e.target.value = '';
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить фото",
        variant: "destructive",
      });
    }
  };

  const handleDocumentSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Файл слишком большой",
        description: "Максимальный размер файла — 5 МБ",
        variant: "destructive",
      });
      return;
    }

    try {
      const base64 = await convertFileToBase64(file);
      
      let documentType: 'pdf' | 'doc' | 'docx' = 'pdf';
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.doc')) {
        documentType = 'doc';
      } else if (fileName.endsWith('.docx')) {
        documentType = 'docx';
      } else if (fileName.endsWith('.pdf')) {
        documentType = 'pdf';
      } else if (file.type === 'application/msword') {
        documentType = 'doc';
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        documentType = 'docx';
      }
      
      setAttachments([...attachments, { 
        type: documentType, 
        value: base64, 
        name: file.name 
      }]);
      e.target.value = '';
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить документ",
        variant: "destructive",
      });
    }
  };

  const handleAddLink = () => {
    if (linkInput.trim()) {
      setAttachments([...attachments, { type: 'link', value: linkInput.trim() }]);
      setLinkInput('');
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  if (step === 5) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 pb-24">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <Card className="p-8 space-y-4 shadow-soft rounded-2xl text-left">
            <h2 className="text-2xl font-bold text-foreground text-center">Заявка отправлена</h2>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">Спасибо! Мы получили вашу заявку и постараемся оплатить её как можно скорее.</p>
              <div className="space-y-1">
                <p><span className="text-muted-foreground">Сумма:</span> <span className="font-semibold">{numAmount.toLocaleString('ru-RU')} ₽</span></p>
                <p><span className="text-muted-foreground">Заморозили на балансе:</span> <span className="font-semibold">{amountUsdt.toFixed(8)} USDT</span></p>
                <p><span className="text-muted-foreground">Статус:</span> <span className="font-semibold text-blue-600">ОТПРАВЛЕНА</span></p>
              </div>
            </div>
          </Card>
          <Button onClick={onBack} className="w-full rounded-xl" size="lg" data-testid="button-back-to-dashboard">
            Вернуться на главную страницу
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] px-4 pt-6 pb-24 bg-background">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} className="gap-2 -ml-2" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Button>
          <span className="text-sm text-muted-foreground">Шаг {step}/4</span>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Укажите сумму в ₽</h1>
              <p className="text-sm text-muted-foreground">
                Ваш баланс в рублях: <span className="font-semibold text-foreground">{availableRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</span>
              </p>
            </div>

            <div className="space-y-4">
              <Input
                type="number"
                placeholder="Например, 2 500"
                value={amountRub}
                onChange={(e) => setAmountRub(e.target.value)}
                className="text-2xl h-16 text-center font-semibold rounded-xl"
                data-testid="input-amount-rub"
              />
              
              {frozenRate > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Зафиксированный курс: {rateToUse.toFixed(2)} ₽
                </p>
              )}
              
              {numAmount > 0 && !hasMinError && !hasMaxError && !hasInsufficientFunds && (
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground" data-testid="text-usdt-equivalent">
                    ≈ {amountUsdt.toFixed(8)} USDT
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Будет заморожено: {amountUsdt.toFixed(8)} USDT
                  </p>
                </div>
              )}

              {hasMinError && (
                <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Минимальная сумма — 3 000 ₽.
                    </p>
                  </div>
                </Card>
              )}

              {hasMaxError && (
                <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Максимальная сумма — 100 000 ₽.
                    </p>
                  </div>
                </Card>
              )}

              {hasInsufficientFunds && !hasMinError && !hasMaxError && (
                <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Недостаточно средств. Доступно: <span className="font-semibold">{availableRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</span>. Пополните баланс или уменьшите сумму.
                    </p>
                  </div>
                </Card>
              )}

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1 rounded-xl">
                  Отмена
                </Button>
                <Button 
                  onClick={handleNext} 
                  className="flex-1 rounded-xl"
                  disabled={!amountRub || numAmount < 3000 || numAmount > 100000 || hasInsufficientFunds}
                  data-testid="button-next-step"
                >
                  Далее
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Выберите срочность обработки</h1>

            <div className="space-y-4">
              <div className="grid gap-3">
                <Card
                  className={`p-5 cursor-pointer transition-soft rounded-2xl shadow-soft hover-lift ${
                    urgency === 'urgent' ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setUrgency('urgent')}
                  data-testid="card-urgency-urgent"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                      <Zap className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg">⚡ Срочно (5–10 минут)</h3>
                      <p className="text-sm text-muted-foreground">Комиссия +0,5%.</p>
                    </div>
                  </div>
                </Card>

                <Card
                  className={`p-5 cursor-pointer transition-soft rounded-2xl shadow-soft hover-lift ${
                    urgency === 'standard' ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setUrgency('standard')}
                  data-testid="card-urgency-standard"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg">⏱️ Стандартно (10–30 минут)</h3>
                      <p className="text-sm text-muted-foreground">Без комиссии.</p>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-4 bg-primary/5 border-primary/20 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Будет заморожено:</p>
                <p className="text-2xl font-bold text-foreground">{amountUsdt.toFixed(8)} USDT</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Зафиксированный курс: {rateToUse.toFixed(2)} ₽
                </p>
              </Card>

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1 rounded-xl">
                  Назад
                </Button>
                <Button onClick={handleNext} className="flex-1 rounded-xl" data-testid="button-next-step">
                  Далее
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Прикрепите QR-код, ссылку или PDF-документ со счётом на оплату</h1>

            <div className="space-y-4">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraFileSelected}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleGallerySelected}
                className="hidden"
              />
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleDocumentSelected}
                className="hidden"
              />

              <Card className="p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Paperclip className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Варианты прикрепления:</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={handleCapturePhoto} className="flex-col h-auto py-3 rounded-xl" data-testid="button-capture-photo">
                    <Camera className="w-5 h-5 mb-1" />
                    <span className="text-xs truncate overflow-hidden w-full text-center">Сделать фото</span>
                  </Button>
                  <Button variant="outline" onClick={handleGalleryPhoto} className="flex-col h-auto py-3 rounded-xl" data-testid="button-gallery-photo">
                    <ImageIcon className="w-5 h-5 mb-1" />
                    <span className="text-xs truncate overflow-hidden w-full text-center">Из галереи</span>
                  </Button>
                  <Button variant="outline" onClick={handleUploadDocument} className="flex-col h-auto py-3 rounded-xl" data-testid="button-upload-document">
                    <FileText className="w-5 h-5 mb-1" />
                    <span className="text-xs truncate overflow-hidden w-full text-center">Документ</span>
                  </Button>
                </div>
              </Card>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Вставьте ссылку"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    className="rounded-xl"
                    data-testid="input-link"
                  />
                  <Button onClick={handleAddLink} variant="outline" className="rounded-xl shrink-0" data-testid="button-add-link">
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Прикреплённые файлы:</p>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att, idx) => (
                      <Card key={idx} className="flex items-center gap-2 p-2 pr-1 rounded-xl" data-testid={`attachment-${idx}`}>
                        {att.type === 'image' && <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                        {att.type === 'link' && <LinkIcon className="w-4 h-4 text-muted-foreground" />}
                        {att.type === 'pdf' && <FileText className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-sm truncate max-w-[120px]">{att.name || att.value}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                          onClick={() => handleRemoveAttachment(idx)}
                          data-testid={`button-remove-attachment-${idx}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1 rounded-xl">
                  Назад
                </Button>
                <Button onClick={handleNext} className="flex-1 rounded-xl" data-testid="button-next-step">
                  Далее
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Комментарий к заявке (необязательно)</h1>

            <div className="space-y-4">
              <Textarea
                placeholder="Например: оплатить без чаевых"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="rounded-xl"
                data-testid="input-comment"
              />

              <Card className="p-5 bg-muted/30 border-muted rounded-2xl">
                <h3 className="font-semibold text-foreground mb-3">Сводка заявки:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Сумма:</span>
                    <span className="font-semibold text-foreground" data-testid="text-summary-rub">{numAmount.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Будет заморожено:</span>
                    <span className="font-semibold text-foreground" data-testid="text-summary-usdt">{amountUsdt.toFixed(8)} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Срочность:</span>
                    <span className="font-semibold capitalize text-foreground">{urgency === 'urgent' ? 'Срочно' : 'Стандартно'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Курс:</span>
                    <span className="font-semibold text-foreground">{rateToUse.toFixed(2)} ₽</span>
                  </div>
                  {urgency === 'urgent' && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-500 pt-2 border-t font-medium">⚡ Комиссия +0,5%</p>
                  )}
                  {urgency === 'standard' && (
                    <p className="text-xs text-green-600 dark:text-green-500 pt-2 border-t font-medium">✓ Без комиссии</p>
                  )}
                </div>
              </Card>

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1 rounded-xl">
                  Назад
                </Button>
                <Button onClick={handleSubmit} className="flex-1 rounded-xl" data-testid="button-submit-payment">
                  Отправить заявку
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
