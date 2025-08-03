<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diseño Compacto - Entrada de Stock</title>
    <style>
        :root {
            --primary: #3b82f6;
            --primary-light: #eff6ff;
            --secondary: #6b7280;
            --success: #10b981;
            --warning: #f59e0b;
            --error: #ef4444;
            --text: #1f2937;
            --text-muted: #6b7280;
            --bg: #f9fafb;
            --surface: #ffffff;
            --border: #e5e7eb;
            --spacing-xs: 0.25rem;
            --spacing-sm: 0.5rem;
            --spacing-md: 1rem;
            --radius-sm: 0.375rem;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg);
            padding: var(--spacing-md);
            color: var(--text);
        }

        .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: var(--surface);
            border-radius: var(--radius-sm);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .receipt-header {
            background: var(--primary);
            color: white;
            padding: var(--spacing-md);
            text-align: center;
        }

        .receipt-title {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: var(--spacing-xs);
        }

        .receipt-subtitle {
            opacity: 0.9;
            font-size: 0.875rem;
        }

        .receipt-body {
            padding: var(--spacing-md);
        }

        /* Tabla de productos */
        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: var(--spacing-md);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            overflow: hidden;
        }

        .products-table th {
            background: var(--primary-light);
            color: var(--primary);
            font-weight: 600;
            padding: var(--spacing-sm);
            text-align: left;
            font-size: 0.875rem;
            border-bottom: 1px solid var(--border);
        }

        .products-table td {
            padding: var(--spacing-sm);
            border-bottom: 1px solid var(--border);
            vertical-align: middle;
        }

        .products-table tbody tr:hover {
            background: rgba(59, 130, 246, 0.05);
        }

        .products-table tbody tr:last-child td {
            border-bottom: none;
        }

        /* Controles compactos */
        .compact-input {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-size: 0.875rem;
            background: var(--surface);
        }

        .compact-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .compact-select {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-size: 0.875rem;
            background: var(--surface);
        }

        .compact-checkbox {
            margin-right: var(--spacing-xs);
        }

        .price-toggle {
            display: flex;
            align-items: center;
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-bottom: 4px;
        }

        .btn-remove {
            background: none;
            border: none;
            color: var(--error);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            font-size: 0.75rem;
        }

        .btn-remove:hover {
            background: rgba(239, 68, 68, 0.1);
        }

        .btn-add {
            background: var(--primary);
            color: white;
            border: none;
            padding: var(--spacing-sm) var(--spacing-md);
            border-radius: var(--radius-sm);
            font-size: 0.875rem;
            cursor: pointer;
            margin-bottom: var(--spacing-md);
        }

        .btn-add:hover {
            background: #2563eb;
        }

        /* Resumen de totales */
        .totals-section {
            background: var(--bg);
            padding: var(--spacing-md);
            border-radius: var(--radius-sm);
            margin-bottom: var(--spacing-md);
        }

        .total-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--spacing-xs) 0;
            border-bottom: 1px solid var(--border);
        }

        .total-line:last-child {
            border-bottom: none;
            font-weight: 700;
            font-size: 1.1rem;
            color: var(--primary);
        }

        .total-label {
            color: var(--text-muted);
            font-size: 0.875rem;
        }

        .total-value {
            font-weight: 600;
        }

        /* Sección de proveedor */
        .provider-section {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: var(--spacing-sm);
            margin-bottom: var(--spacing-md);
        }

        .form-group {
            margin-bottom: var(--spacing-md);
        }

        .form-label {
            display: block;
            font-weight: 600;
            margin-bottom: var(--spacing-xs);
            font-size: 0.875rem;
            color: var(--text);
        }

        .product-preview {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .calculated-price {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.75rem;
        }

        .actions {
            display: flex;
            gap: var(--spacing-sm);
            justify-content: flex-end;
            padding: var(--spacing-md);
            border-top: 1px solid var(--border);
            background: var(--bg);
        }

        .btn {
            padding: var(--spacing-sm) var(--spacing-md);
            border-radius: var(--radius-sm);
            font-weight: 600;
            cursor: pointer;
            border: 1px solid transparent;
        }

        .btn--secondary {
            background: var(--surface);
            color: var(--text);
            border-color: var(--border);
        }

        .btn--primary {
            background: var(--primary);
            color: white;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <!-- Header tipo boleta -->
        <div class="receipt-header">
            <div class="receipt-title">🧾 ENTRADA DE STOCK</div>
            <div class="receipt-subtitle">Registro de productos comprados</div>
        </div>

        <div class="receipt-body">
            <!-- Tabla de productos compacta -->
            <button class="btn-add">➕ Agregar producto</button>
            
            <table class="products-table">
                <thead>
                    <tr>
                        <th style="width: 15%;">📦 Código</th>
                        <th style="width: 30%;">🔍 Producto</th>
                        <th style="width: 10%;">📊 Cant.</th>
                        <th style="width: 15%;">💰 P.Unit</th>
                        <th style="width: 15%;">💵 Subtotal</th>
                        <th style="width: 10%;">⚙️</th>
                        <th style="width: 5%;"></th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Producto 1 -->
                    <tr>
                        <td>
                            <input type="text" class="compact-input" value="001" placeholder="001">
                        </td>
                        <td>
                            <select class="compact-select">
                                <option>Coca Cola 500ml (Stock: 3)</option>
                                <option>Pan Bimbo Grande (Stock: 0)</option>
                                <option>Detergente Ariel 1kg (Stock: 8)</option>
                            </select>
                            <div class="product-preview">✅ #001 - Coca Cola 500ml</div>
                        </td>
                        <td>
                            <input type="number" class="compact-input" value="50" placeholder="0">
                        </td>
                        <td>
                            <div class="price-toggle">
                                <input type="checkbox" class="compact-checkbox" checked>
                                <span>Precio fijo</span>
                            </div>
                            <input type="number" class="compact-input" value="0.80" placeholder="0.00">
                        </td>
                        <td>
                            <strong>S/ 40.00</strong>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Stock: 3 → 53</div>
                        </td>
                        <td>
                            <div style="font-size: 0.75rem; color: var(--success);">
                                ✅ Listo
                            </div>
                        </td>
                        <td>
                            <button class="btn-remove">🗑️</button>
                        </td>
                    </tr>

                    <!-- Producto 2 -->
                    <tr>
                        <td>
                            <input type="text" class="compact-input" value="025" placeholder="001">
                        </td>
                        <td>
                            <select class="compact-select">
                                <option>Pan Bimbo Grande (Stock: 0)</option>
                                <option>Coca Cola 500ml (Stock: 3)</option>
                                <option>Detergente Ariel 1kg (Stock: 8)</option>
                            </select>
                            <div class="product-preview">✅ #025 - Pan Bimbo Grande</div>
                        </td>
                        <td>
                            <input type="number" class="compact-input" value="30" placeholder="0">
                        </td>
                        <td>
                            <div class="price-toggle">
                                <input type="checkbox" class="compact-checkbox">
                                <span>Calcular auto</span>
                            </div>
                            <div class="calculated-price">S/ 1.33 (calc.)</div>
                        </td>
                        <td>
                            <strong>S/ 40.00</strong>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Stock: 0 → 30</div>
                        </td>
                        <td>
                            <div style="font-size: 0.75rem; color: var(--warning);">
                                ⚡ Auto
                            </div>
                        </td>
                        <td>
                            <button class="btn-remove">🗑️</button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Totales compactos -->
            <div class="totals-section">
                <div class="total-line">
                    <span class="total-label">💰 Productos con precio fijo:</span>
                    <span class="total-value">S/ 40.00</span>
                </div>
                <div class="total-line">
                    <span class="total-label">📊 A distribuir automáticamente:</span>
                    <span class="total-value">S/ 40.00</span>
                </div>
                <div class="total-line">
                    <span class="total-label">🔢 Productos sin precio:</span>
                    <span class="total-value">30 unidades</span>
                </div>
                <div class="total-line">
                    <span>💵 TOTAL DE LA ENTRADA:</span>
                    <span>S/ 80.00</span>
                </div>
            </div>

            <!-- Total pagado y proveedor en una fila -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
                <div class="form-group">
                    <label class="form-label">💵 Total pagado</label>
                    <input type="number" class="compact-input" value="80.00" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label class="form-label">🧾 IGV incluido</label>
                    <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                        <input type="checkbox" class="compact-checkbox">
                        <span style="font-size: 0.875rem;">Hay IGV en la factura</span>
                    </div>
                </div>
            </div>

            <!-- Proveedor compacto -->
            <div class="form-group">
                <label class="form-label">🏪 Proveedor (opcional)</label>
                <div class="provider-section">
                    <input type="text" class="compact-input" placeholder="DNI/RUC: 12345678">
                    <select class="compact-select">
                        <option value="">Seleccionar por nombre...</option>
                        <optgroup label="Empresas">
                            <option>Distribuidora ABC SAC - RUC: 20123456789</option>
                            <option>Comercial XYZ EIRL - RUC: 20987654321</option>
                        </optgroup>
                        <optgroup label="Personas">
                            <option>Juan Pérez - DNI: 12345678</option>
                        </optgroup>
                    </select>
                </div>
                <div class="product-preview" style="margin-top: var(--spacing-xs);">
                    ✅ Seleccionado: Distribuidora ABC SAC - 20123456789
                </div>
            </div>

            <!-- Observaciones compactas -->
            <div class="form-group">
                <label class="form-label">📝 Observaciones</label>
                <textarea class="compact-input" rows="2" placeholder="Detalles adicionales..."></textarea>
            </div>
        </div>

        <!-- Acciones -->
        <div class="actions">
            <button class="btn btn--secondary">Cancelar</button>
            <button class="btn btn--primary">✅ Registrar 2 productos</button>
        </div>
    </div>
</body>
</html>