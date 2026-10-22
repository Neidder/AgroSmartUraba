import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// --- VISTA DE LOGIN (Simulada) ---
function Login({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-5xl mb-2">🌱</div>
          <CardTitle className="text-2xl">AgroSmart Urabá</CardTitle>
          <p className="text-sm text-gray-500">Inicia sesión (Simulación)</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Correo</label>
            <Input type="email" placeholder="admin@agrosmart.com" />
          </div>
          <div>
            <label className="text-sm font-medium">Contraseña</label>
            <Input type="password" placeholder="••••••" />
          </div>
          <Button className="w-full" onClick={onLogin}>
            Iniciar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// --- LAYOUT PRINCIPAL (Menú) ---
function Layout({ 
  children, 
  onLogout, 
  active, 
  setPage 
}: { 
  children: ReactNode
  onLogout: () => void
  active: string
  setPage: (page: string) => void 
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-green-700">🌱 AgroSmart</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div 
            className={`p-2 rounded cursor-pointer ${active === 'productores' ? 'bg-green-100 text-green-800 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => setPage('productores')}
          >
            👥 Productores
          </div>
          <div 
            className={`p-2 rounded cursor-pointer ${active === 'fincas' ? 'bg-green-100 text-green-800 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => setPage('fincas')}
          >
            🏡 Fincas
          </div>
          <div className="p-2 rounded cursor-pointer hover:bg-gray-100 text-gray-400">🌾 Cultivos (Próximamente)</div>
          <div className="p-2 rounded cursor-pointer hover:bg-gray-100 text-gray-400">📦 Cosechas (Próximamente)</div>
        </nav>
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full" onClick={onLogout}>
            Cerrar Sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  )
}

// --- VISTA DE PRODUCTORES (Simulada) ---
function Productores() {
  const [productores] = useState([
    { id: 1, nombre: 'Juan Pérez', municipio: 'Apartadó', vereda: 'El Bosque', telefono: '300 123 4567' },
    { id: 2, nombre: 'María López', municipio: 'Turbo', vereda: 'La Playa', telefono: '311 987 6543' },
    { id: 3, nombre: 'Carlos Ruiz', municipio: 'Carepa', vereda: 'Piedras Blancas', telefono: '315 555 4433' },
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Productores</h1>
          <p className="text-gray-500">Gestión de productores agrícolas</p>
        </div>
        <Button className="bg-green-700 hover:bg-green-800">+ Nuevo Productor</Button>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Municipio</TableHead>
                <TableHead>Vereda</TableHead>
                <TableHead>Teléfono</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productores.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>{p.municipio}</TableCell>
                  <TableCell>{p.vereda}</TableCell>
                  <TableCell>{p.telefono}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// --- APP PRINCIPAL ---
export default function App() {
  const [logged, setLogged] = useState(false)
  const [page, setPage] = useState('productores')

  if (!logged) {
    return <Login onLogin={() => setLogged(true)} />
  }

  return (
    <Layout 
      onLogout={() => setLogged(false)} 
      active={page}
      setPage={setPage}
    >
      {page === 'productores' && <Productores />}
      
      {page === 'fincas' && (
         <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <span className="text-6xl">🏡</span>
            <p className="text-xl">Módulo de Fincas en construcción...</p>
         </div>
      )}
    </Layout>
  )
}