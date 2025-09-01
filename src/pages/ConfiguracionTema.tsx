import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Palette, Type, Save, RotateCcw } from "lucide-react";

const ConfiguracionTema = () => {
  const { toast } = useToast();
  const [themeConfig, setThemeConfig] = useState({
    primary_color: '215 85% 20%',
    secondary_color: '215 40% 90%',
    font_family: 'Inter'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const availableFonts = [
    { value: 'Inter', label: 'Inter (Default)' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Nunito', label: 'Nunito' },
    { value: 'Playfair Display', label: 'Playfair Display' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro' },
    { value: 'Oswald', label: 'Oswald' }
  ];

  useEffect(() => {
    loadThemeConfig();
  }, []);

  const loadThemeConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('cooperative_config')
        .select('primary_color, secondary_color')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setThemeConfig({
          primary_color: data.primary_color || '215 85% 20%',
          secondary_color: data.secondary_color || '215 40% 90%',
          font_family: localStorage.getItem('preferred_font') || 'Inter'
        });
      }
    } catch (error: any) {
      console.error('Error loading theme config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemeConfig = async () => {
    setIsSaving(true);
    try {
      // Update cooperative config with colors
      const { error } = await supabase
        .from('cooperative_config')
        .upsert({
          primary_color: themeConfig.primary_color,
          secondary_color: themeConfig.secondary_color
        });

      if (error) throw error;

      // Save font preference locally
      localStorage.setItem('preferred_font', themeConfig.font_family);

      // Apply theme changes to CSS variables
      applyThemeChanges();

      toast({
        title: "Configuración guardada",
        description: "Los cambios de tema se han aplicado correctamente.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración del tema.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const applyThemeChanges = () => {
    const root = document.documentElement;
    
    // Apply color changes
    root.style.setProperty('--primary', themeConfig.primary_color);
    root.style.setProperty('--secondary', themeConfig.secondary_color);
    
    // Apply font changes
    if (themeConfig.font_family !== 'Inter') {
      loadGoogleFont(themeConfig.font_family);
    }
    root.style.setProperty('--font-sans', `"${themeConfig.font_family}", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`);
  };

  const loadGoogleFont = (fontName: string) => {
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(' ', '+')}:wght@300;400;500;600;700&display=swap`;
    
    // Check if font is already loaded
    const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontUrl;
      document.head.appendChild(link);
    }
  };

  const resetToDefaults = () => {
    setThemeConfig({
      primary_color: '215 85% 20%',
      secondary_color: '215 40% 90%',
      font_family: 'Inter'
    });
  };

  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const hslToHex = (hsl: string): string => {
    const [h, s, l] = hsl.split(' ').map((val, i) => {
      if (i === 0) return parseInt(val) / 360;
      return parseInt(val) / 100;
    });

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración de Tema</h1>
          <p className="text-muted-foreground">
            Personaliza los colores y fuentes de la plataforma
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="mr-2 h-5 w-5" />
              Colores del Tema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Color Primario</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={hslToHex(themeConfig.primary_color)}
                  onChange={(e) => setThemeConfig({
                    ...themeConfig,
                    primary_color: hexToHsl(e.target.value)
                  })}
                  className="w-20 h-10"
                />
                <Input
                  value={themeConfig.primary_color}
                  onChange={(e) => setThemeConfig({
                    ...themeConfig,
                    primary_color: e.target.value
                  })}
                  placeholder="Ej: 215 85% 20%"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Formato HSL: hue saturation% lightness%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color">Color Secundario</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={hslToHex(themeConfig.secondary_color)}
                  onChange={(e) => setThemeConfig({
                    ...themeConfig,
                    secondary_color: hexToHsl(e.target.value)
                  })}
                  className="w-20 h-10"
                />
                <Input
                  value={themeConfig.secondary_color}
                  onChange={(e) => setThemeConfig({
                    ...themeConfig,
                    secondary_color: e.target.value
                  })}
                  placeholder="Ej: 215 40% 90%"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Vista Previa</h4>
              <div className="space-y-2">
                <div 
                  className="h-12 rounded border flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: `hsl(${themeConfig.primary_color})` }}
                >
                  Color Primario
                </div>
                <div 
                  className="h-12 rounded border flex items-center justify-center"
                  style={{ backgroundColor: `hsl(${themeConfig.secondary_color})` }}
                >
                  Color Secundario
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Type className="mr-2 h-5 w-5" />
              Tipografía
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="font-family">Fuente Principal</Label>
              <Select 
                value={themeConfig.font_family} 
                onValueChange={(value) => setThemeConfig({
                  ...themeConfig,
                  font_family: value
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFonts.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Vista Previa de Fuente</h4>
              <div 
                className="space-y-2 p-4 border rounded"
                style={{ fontFamily: themeConfig.font_family }}
              >
                <h3 className="text-lg font-semibold">
                  Título de Ejemplo
                </h3>
                <p className="text-sm">
                  Este es un párrafo de ejemplo que muestra cómo se ve el texto con la fuente seleccionada.
                </p>
                <p className="text-xs text-muted-foreground">
                  Texto secundario más pequeño.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Aplicar Cambios</h3>
              <p className="text-sm text-muted-foreground">
                Guarda la configuración para aplicar los cambios al tema.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetToDefaults}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restaurar
              </Button>
              <Button onClick={saveThemeConfig} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfiguracionTema;