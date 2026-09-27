"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import Icon from "@/components/Icon";
import { CustomizeModal } from "@/components/Sidebar";
import { resolveVisible } from "@/components/navConfig";

// Parte interactiva del perfil: tema, personalizar menú y cerrar sesión.
export default function PerfilClient({ sidebarPages }) {
  const router = useRouter();
  const [customizing, setCustomizing] = useState(false);
  const [visible, setVisible] = useState(() => resolveVisible(sidebarPages));

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="ui-card" style={{ padding: 8 }}>
      <div className="settings-row settings-row--wrap">
        <span className="settings-row__icon"><Icon name="sun" size={18} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="settings-row__title">Apariencia</p>
          <p className="settings-row__hint">Claro, oscuro o según tu sistema</p>
        </div>
        <div className="settings-row__control" style={{ width: 250 }}><ThemeToggle /></div>
      </div>
      <button type="button" className="settings-row settings-row--button" onClick={() => setCustomizing(true)}>
        <span className="settings-row__icon"><Icon name="menu-grid" size={18} /></span>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <p className="settings-row__title">Personalizar menú</p>
          <p className="settings-row__hint">{visible.length} páginas visibles en el menú lateral</p>
        </div>
        <Icon name="chevron-right" size={18} />
      </button>
      <button type="button" className="settings-row settings-row--button settings-row--danger" onClick={signOut}>
        <span className="settings-row__icon"><Icon name="log-out" size={18} /></span>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <p className="settings-row__title">Cerrar sesión</p>
        </div>
      </button>

      {customizing && (
        <CustomizeModal
          visible={visible}
          onClose={() => setCustomizing(false)}
          onSaved={(keys) => { setVisible(keys); setCustomizing(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
