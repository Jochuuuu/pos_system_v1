#!/usr/bin/env node
/**
 * Script de Setup para Base de Datos POS
 * ====================================
 * 
 * Este script crea la base de datos 'pos_system' y ejecuta el schema completo.
 * 
 * Uso:
 *   node setup.js                    # Setup básico
 *   node setup.js --force           # Forzar recreación
 *   node setup.js --database mi_pos # Usar otro nombre de DB
 *   node setup.js --quiet           # Modo silencioso
 * 
 * Requisitos:
 *   npm install pg chalk yargs
 * 
 * Autor: Sistema POS
 * Versión: 1.0
 */

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

class POSDatabaseSetup {
    constructor(configFile = 'config.json', quiet = false) {
        this.configFile = configFile;
        this.quiet = quiet;
        this.config = {};
        this.startTime = Date.now();
        
        // Contadores para el resumen
        this.stats = {
            tablas: 0,
            funciones: 0,
            triggers: 0,
            vistas: 0,
            indices: 0,
            datos: 0
        };
    }

    log(message, color = chalk.white, emoji = '') {
        if (!this.quiet) {
            console.log(color(`${emoji} ${message}`));
        }
    }

    logError(message) {
        this.log(`ERROR: ${message}`, chalk.red, '❌');
    }

    logSuccess(message) {
        this.log(message, chalk.green, '✅');
    }

    logInfo(message) {
        this.log(message, chalk.blue, '🔍');
    }

    logWarning(message) {
        this.log(message, chalk.yellow, '⚠️');
    }

    async cargarConfiguracion() {
        try {
            // Configuración por defecto
            this.config = {
                host: 'localhost',
                port: 5432,
                user: 'postgres',
                password: 'postgres',
                database_name: 'pos_system',
                schema_file: 'schema.sql',
                force_recreate: false,
                verify_creation: true
            };

            // Intentar cargar desde archivo
            try {
                const configData = await fs.readFile(this.configFile, 'utf8');
                const fileConfig = JSON.parse(configData);
                
                // Merge con configuración por defecto
                this.config = { ...this.config, ...fileConfig };
                this.logSuccess(`Configuración cargada desde ${this.configFile}`);
            } catch (error) {
                this.logWarning(`Archivo ${this.configFile} no encontrado, usando configuración por defecto`);
                await this.crearConfigEjemplo();
            }

            return true;
        } catch (error) {
            this.logError(`Error cargando configuración: ${error.message}`);
            return false;
        }
    }

    async crearConfigEjemplo() {
        const configEjemplo = {
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: 'postgres',
            database_name: 'pos_system',
            schema_file: 'schema.sql',
            force_recreate: false,
            verify_creation: true
        };

        try {
            await fs.writeFile(
                'config.example.json', 
                JSON.stringify(configEjemplo, null, 2), 
                'utf8'
            );
            this.logInfo('Creado config.example.json como ejemplo');
        } catch (error) {
            this.logWarning(`No se pudo crear config.example.json: ${error.message}`);
        }
    }

    async conectarPostgres(database = 'postgres') {
        try {
            const client = new Client({
                host: this.config.host,
                port: this.config.port,
                user: this.config.user,
                password: this.config.password,
                database: database
            });

            await client.connect();
            return client;
        } catch (error) {
            this.logError(`Error conectando a PostgreSQL: ${error.message}`);
            return null;
        }
    }

    async verificarDatabaseExiste(client, dbName) {
        try {
            const result = await client.query(
                'SELECT 1 FROM pg_database WHERE datname = $1',
                [dbName]
            );
            return result.rows.length > 0;
        } catch (error) {
            this.logError(`Error verificando base de datos: ${error.message}`);
            return false;
        }
    }

    async crearDatabase(client, dbName) {
        try {
            // Usar identifier seguro para evitar inyección SQL
            await client.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8'`);
            this.logSuccess(`Base de datos '${dbName}' creada exitosamente`);
            return true;
        } catch (error) {
            this.logError(`Error creando base de datos: ${error.message}`);
            return false;
        }
    }

    async eliminarDatabase(client, dbName) {
        try {
            // Terminar conexiones activas
            await client.query(`
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '${dbName}'
                AND pid <> pg_backend_pid()
            `);
            
            await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
            this.logSuccess(`Base de datos '${dbName}' eliminada`);
            return true;
        } catch (error) {
            this.logError(`Error eliminando base de datos: ${error.message}`);
            return false;
        }
    }

    async leerSchemaFile() {
        const schemaPath = this.config.schema_file;
        try {
            // Verificar que el archivo existe
            await fs.access(schemaPath);
            
            const content = await fs.readFile(schemaPath, 'utf8');
            
            // Contar líneas para información
            const lines = content.split('\n').length;
            const sizeKB = Buffer.byteLength(content, 'utf8') / 1024;
            
            this.logSuccess(`Schema leído: ${lines.toLocaleString()} líneas, ${sizeKB.toFixed(1)} KB`);
            return content;
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.logError(`Archivo ${schemaPath} no encontrado`);
            } else {
                this.logError(`Error leyendo ${schemaPath}: ${error.message}`);
            }
            return null;
        }
    }

    contarElementosSQL(sqlContent) {
        const contentUpper = sqlContent.toUpperCase();
        
        // Contar diferentes elementos
        this.stats.tablas = (contentUpper.match(/CREATE TABLE/g) || []).length;
        this.stats.funciones = (contentUpper.match(/CREATE (OR REPLACE )?FUNCTION/g) || []).length;
        this.stats.triggers = (contentUpper.match(/CREATE TRIGGER/g) || []).length;
        this.stats.vistas = (contentUpper.match(/CREATE VIEW/g) || []).length;
        this.stats.indices = (contentUpper.match(/CREATE (UNIQUE )?INDEX/g) || []).length;
        this.stats.datos = (contentUpper.match(/INSERT INTO/g) || []).length + 
                          (contentUpper.match(/SELECT CREAR_USUARIO/g) || []).length;
    }

    async ejecutarSchema(client, sqlContent) {
        try {
            this.log('Ejecutando SQL schema...', chalk.blue, '⚡');
            
            // Contar elementos antes de ejecutar
            this.contarElementosSQL(sqlContent);
            
            // Ejecutar en una transacción
            await client.query('BEGIN');
            try {
                await client.query(sqlContent);
                await client.query('COMMIT');
                this.logSuccess('Schema ejecutado exitosamente');
                return true;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        } catch (error) {
            this.logError(`Error ejecutando schema: ${error.message}`);
            return false;
        }
    }

    async verificarCreacion(client) {
        try {
            const verificacion = {};
            
            // Contar tablas
            const tablas = await client.query(`
                SELECT COUNT(*) as count FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            `);
            verificacion.tablas = parseInt(tablas.rows[0].count);
            
            // Contar funciones
            const funciones = await client.query(`
                SELECT COUNT(*) as count FROM information_schema.routines 
                WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
            `);
            verificacion.funciones = parseInt(funciones.rows[0].count);
            
            // Contar triggers
            const triggers = await client.query(`
                SELECT COUNT(*) as count FROM information_schema.triggers 
                WHERE trigger_schema = 'public'
            `);
            verificacion.triggers = parseInt(triggers.rows[0].count);
            
            // Contar vistas
            const vistas = await client.query(`
                SELECT COUNT(*) as count FROM information_schema.views 
                WHERE table_schema = 'public'
            `);
            verificacion.vistas = parseInt(vistas.rows[0].count);
            
            // Contar índices
            const indices = await client.query(`
                SELECT COUNT(*) as count FROM pg_indexes 
                WHERE schemaname = 'public'
            `);
            verificacion.indices = parseInt(indices.rows[0].count);
            
            // Verificar datos (contar registros en tablas principales)
            try {
                const familia = await client.query('SELECT COUNT(*) as count FROM familia');
                const usuario = await client.query('SELECT COUNT(*) as count FROM usuario');
                verificacion.datos = parseInt(familia.rows[0].count) + parseInt(usuario.rows[0].count);
            } catch (error) {
                verificacion.datos = 0;
            }
            
            return verificacion;
        } catch (error) {
            this.logError(`Error verificando creación: ${error.message}`);
            return {};
        }
    }

    mostrarResumen(verificacion) {
        const tiempoTotal = (Date.now() - this.startTime) / 1000;
        
        console.log(); // Línea en blanco
        this.log('📊 RESUMEN DE CREACIÓN:', chalk.bold.cyan);
        
        const elementos = [
            ['📋 Tablas', verificacion.tablas || 0],
            ['🔧 Funciones', verificacion.funciones || 0],
            ['⚡ Triggers', verificacion.triggers || 0],
            ['📈 Vistas', verificacion.vistas || 0],
            ['🔍 Índices', verificacion.indices || 0],
            ['💾 Datos iniciales', verificacion.datos || 0]
        ];
        
        elementos.forEach(([nombre, cantidad]) => {
            if (cantidad > 0) {
                this.log(`  ${nombre}: ${cantidad}`, chalk.green, '✅');
            } else {
                this.log(`  ${nombre}: ${cantidad}`, chalk.yellow, '⚠️');
            }
        });
        
        console.log(); // Línea en blanco
        this.log(`🕒 Tiempo total: ${tiempoTotal.toFixed(1)} segundos`, chalk.cyan);
        console.log(); // Línea en blanco
        this.log('💡 PRÓXIMOS PASOS:', chalk.bold.magenta);
        this.log(`  • Configurar backend para conectar a '${this.config.database_name}'`, chalk.white);
        this.log('  • Probar login con usuario: admin', chalk.white);
        this.log('  • Verificar conexión desde tu aplicación', chalk.white);
        console.log(); // Línea en blanco
    }

    async preguntarUsuario(pregunta) {
        if (this.quiet) {
            return true;
        }

        // Usar readline para input del usuario
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            const askQuestion = () => {
                rl.question(chalk.yellow(`❓ ${pregunta} (s/n): `), (respuesta) => {
                    const resp = respuesta.toLowerCase();
                    if (['s', 'si', 'y', 'yes'].includes(resp)) {
                        rl.close();
                        resolve(true);
                    } else if (['n', 'no'].includes(resp)) {
                        rl.close();
                        resolve(false);
                    } else {
                        console.log(chalk.red('❌ Por favor responde \'s\' o \'n\''));
                        askQuestion();
                    }
                });
            };
            askQuestion();
        });
    }

    async ejecutarSetup(forceRecreate = false, databaseName = null) {
        try {
            // Actualizar configuración si se proporcionan parámetros
            if (databaseName) {
                this.config.database_name = databaseName;
            }
            if (forceRecreate) {
                this.config.force_recreate = true;
            }

            // Banner de inicio
            this.log('🚀 Iniciando setup de base de datos POS...', chalk.bold.cyan);
            console.log(); // Línea en blanco
            
            // 1. Conectar a PostgreSQL
            this.logInfo(`Conectando a PostgreSQL (${this.config.host}:${this.config.port})...`);
            const connDefault = await this.conectarPostgres('postgres');
            if (!connDefault) {
                return false;
            }
            this.logSuccess('Conectado a PostgreSQL');
            
            // 2. Verificar si existe la base de datos
            const dbName = this.config.database_name;
            this.logInfo(`Verificando si existe DB '${dbName}'...`);
            let dbExiste = await this.verificarDatabaseExiste(connDefault, dbName);
            
            if (dbExiste) {
                if (this.config.force_recreate) {
                    this.logWarning(`DB '${dbName}' existe, eliminando (--force activado)...`);
                    if (!await this.eliminarDatabase(connDefault, dbName)) {
                        await connDefault.end();
                        return false;
                    }
                    dbExiste = false;
                } else {
                    this.logWarning(`DB '${dbName}' ya existe`);
                    const recrear = await this.preguntarUsuario(`¿Recrear la base de datos '${dbName}'?`);
                    if (!recrear) {
                        await connDefault.end();
                        this.log('Setup cancelado por el usuario', chalk.yellow, '⏹️');
                        return true;
                    } else {
                        if (!await this.eliminarDatabase(connDefault, dbName)) {
                            await connDefault.end();
                            return false;
                        }
                        dbExiste = false;
                    }
                }
            }
            
            // 3. Crear base de datos si no existe
            if (!dbExiste) {
                this.log('Creando base de datos...', chalk.blue, '📦');
                if (!await this.crearDatabase(connDefault, dbName)) {
                    await connDefault.end();
                    return false;
                }
            }
            
            // 4. Cerrar conexión por defecto y conectar a la nueva DB
            await connDefault.end();
            this.logInfo(`Conectando a '${dbName}'...`);
            const connPos = await this.conectarPostgres(dbName);
            if (!connPos) {
                return false;
            }
            this.logSuccess(`Conectado a '${dbName}'`);
            
            // 5. Leer archivo schema
            this.log('Leyendo schema.sql...', chalk.blue, '📄');
            const sqlContent = await this.leerSchemaFile();
            if (!sqlContent) {
                await connPos.end();
                return false;
            }
            
            // 6. Ejecutar schema
            if (!await this.ejecutarSchema(connPos, sqlContent)) {
                await connPos.end();
                return false;
            }
            
            // 7. Verificar creación si está habilitado
            let verificacion = {};
            if (this.config.verify_creation) {
                this.log('Verificando creación...', chalk.blue, '🔍');
                verificacion = await this.verificarCreacion(connPos);
                if (Object.keys(verificacion).length > 0) {
                    this.logSuccess('Verificación completada');
                } else {
                    this.logWarning('No se pudo verificar la creación');
                }
            }
            
            // 8. Cerrar conexión
            await connPos.end();
            
            // 9. Mostrar resumen
            this.logSuccess('¡Setup completado exitosamente!');
            this.mostrarResumen(verificacion);
            
            return true;
            
        } catch (error) {
            this.logError(`Error inesperado durante el setup: ${error.message}`);
            return false;
        }
    }
}

// Función principal
async function main() {
    // Configurar argumentos de línea de comandos
    const argv = yargs(hideBin(process.argv))
        .usage('Uso: $0 [opciones]')
        .option('force', {
            alias: 'f',
            type: 'boolean',
            description: 'Forzar recreación de la base de datos si existe',
            default: false
        })
        .option('database', {
            alias: 'd',
            type: 'string',
            description: 'Nombre de la base de datos (por defecto: pos_system)'
        })
        .option('quiet', {
            alias: 'q',
            type: 'boolean',
            description: 'Modo silencioso (sin output interactivo)',
            default: false
        })
        .option('config', {
            alias: 'c',
            type: 'string',
            description: 'Archivo de configuración (por defecto: config.json)',
            default: 'config.json'
        })
        .help('help')
        .alias('help', 'h')
        .version('1.0.0')
        .alias('version', 'v')
        .example('$0', 'Setup básico')
        .example('$0 --force', 'Forzar recreación')
        .example('$0 --database mi_pos', 'Usar otro nombre de DB')
        .example('$0 --quiet', 'Modo silencioso')
        .argv;

    // Crear instancia del setup
    const setup = new POSDatabaseSetup(argv.config, argv.quiet);
    
    // Cargar configuración
    if (!await setup.cargarConfiguracion()) {
        process.exit(1);
    }
    
    // Ejecutar setup
    const success = await setup.ejecutarSetup(
        argv.force,
        argv.database
    );
    
    // Salir con código apropiado
    process.exit(success ? 0 : 1);
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Error no manejado:'), reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Excepción no capturada:'), error.message);
    process.exit(1);
});

// Ejecutar si es el archivo principal
if (require.main === module) {
    main();
}

module.exports = POSDatabaseSetup;