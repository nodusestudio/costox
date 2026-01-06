import { useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { getSuppliers, saveSuppliers } from '@/utils/storage'
import Modal from '@/components/Modal'
import Button from '@/components/Button'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState(getSuppliers())
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: '', category: '' })

  const handleOpenModal = (supplier = null) => {
    if (supplier) {
      setEditingId(supplier.id)
      setFormData({ name: supplier.name, category: supplier.category })
    } else {
      setEditingId(null)
      setFormData({ name: '', category: '' })
    }
    setShowModal(true)
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('El nombre del proveedor es requerido')
      return
    }

    let updatedSuppliers
    if (editingId) {
      updatedSuppliers = suppliers.map(s =>
        s.id === editingId ? { ...s, ...formData } : s
      )
    } else {
      updatedSuppliers = [
        ...suppliers,
        {
          id: Date.now(),
          name: formData.name,
          category: formData.category,
          createdAt: new Date().toISOString(),
        },
      ]
    }

    setSuppliers(updatedSuppliers)
    saveSuppliers(updatedSuppliers)
    setShowModal(false)
  }

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este proveedor?')) {
      const updatedSuppliers = suppliers.filter(s => s.id !== id)
      setSuppliers(updatedSuppliers)
      saveSuppliers(updatedSuppliers)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Proveedores</h2>
          <p className="text-gray-400 text-sm mt-1">Registro de nombres y categorías</p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          icon={Plus}
          label="Nuevo Proveedor"
        />
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-dark-card rounded-lg p-8 border border-gray-700 text-center">
          <p className="text-gray-400 mb-4">No hay proveedores registrados</p>
          <Button onClick={() => handleOpenModal()} label="Crear primer proveedor" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(supplier => (
            <div key={supplier.id} className="bg-dark-card rounded-lg p-5 border border-gray-700 hover:border-primary-blue transition-colors">
              <h3 className="font-semibold text-lg text-white mb-2">{supplier.name}</h3>
              {supplier.category && (
                <p className="text-sm text-gray-400 mb-4">
                  <span className="inline-block bg-primary-blue/20 text-primary-blue px-3 py-1 rounded">
                    {supplier.category}
                  </span>
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleOpenModal(supplier)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-blue/20 hover:bg-primary-blue/30 text-primary-blue px-3 py-2 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                  <span className="text-sm">Editar</span>
                </button>
                <button
                  onClick={() => handleDelete(supplier.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 px-3 py-2 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                  <span className="text-sm">Eliminar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Proveedor *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none"
                placeholder="Ej: Distribuidor ABC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Categoría (Opcional)
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none"
                placeholder="Ej: Lácteos, Verduras, etc."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-primary-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
