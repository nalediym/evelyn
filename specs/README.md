# Evelyn Specs

Repositorio centralizado para las especificaciones OpenAPI y AsyncAPI de la plataforma Evelyn Multiverse Storytelling.

## Descripción

Este repositorio contiene las especificaciones técnicas que definen la interfaz entre los diferentes componentes de Evelyn:

- **OpenAPI 3.0.3**: Especificación REST API para operaciones CRUD y gestión de mundos e historias
- **AsyncAPI 3.0.0**: Especificación para eventos en tiempo real y comunicación WebSocket

## Estructura

```
evelyn-specs/
├── openapi.yaml          # Especificación REST API
├── asyncapi.yaml         # Especificación eventos en tiempo real
├── .github/
│   └── workflows/
│       └── validate-specs.yml  # Validación automática de especificaciones
└── README.md
```

## Uso como Submódulo

Este repositorio está diseñado para ser usado como submódulo Git en los repositorios de implementación:

### Python (FastAPI)
```bash
cd evelyn-python
git submodule add https://github.com/nalediym/evelyn-specs.git specs
```

### Elixir (Phoenix)
```bash
cd evelyn-elixir
git submodule add https://github.com/nalediym/evelyn-specs.git specs
```

## Validación

Las especificaciones se validan automáticamente en cada commit usando GitHub Actions:

- Validación de sintaxis OpenAPI
- Validación de sintaxis AsyncAPI
- Verificación de consistencia entre especificaciones

## Desarrollo

### Requisitos
- Node.js 18+
- npm o yarn

### Instalación
```bash
npm install -g @apidevtools/swagger-cli
npm install -g @asyncapi/cli
```

### Validación Local
```bash
# Validar OpenAPI
swagger-cli validate openapi.yaml

# Validar AsyncAPI
asyncapi validate asyncapi.yaml
```

## Versionado

Este repositorio sigue Semantic Versioning (SemVer):
- **MAJOR**: Cambios incompatibles en la API
- **MINOR**: Nuevas funcionalidades compatibles hacia atrás
- **PATCH**: Correcciones de bugs compatibles hacia atrás

## Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.
