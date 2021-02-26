const readline = require('readline')
const template = require('@babel/template')
const _ = require('lodash')

console.log('transform react related modules to gloabl', 'v4')

function 战术1 (path, replaceTo) {
  const parentPath = path.findParent((path) => path.isAssignmentExpression())
  if (!parentPath) return
  const objectName = _.get(parentPath, 'node.left.object.name')
  const propertyName = _.get(parentPath, 'node.left.property.name')
  if (objectName !== 'module' || propertyName !== 'exports') return
  const replacePath = path.findParent((path) => path.isCallExpression())
  replacePath.replaceWith(template.default.ast(replaceTo))
}

const walker = function (path, state) {
  const { type } = path.node

  // readline.clearLine(process.stdout, 0)
  // readline.cursorTo(process.stdout, 0, null)
  // process.stdout.write(state.filename)

  // for cjs module example require('react')
  if (type === 'StringLiteral') {
    if (path.node.value === 'react') {
      const parentPath = path.findParent((path) => path.isVariableDeclaration())
      if (!parentPath) return 战术1(path, `global.React`)
      const names = parentPath.node.declarations
      let code = ``
      for (const node of names) {
        code += `var ${node.id.name} = global.React;\n`
      }
      parentPath.replaceWith(template.default.ast(code))
    } else if (path.node.value === 'react-dom') {
      const parentPath = path.findParent((path) => path.isVariableDeclaration())
      if (!parentPath) return 战术1(path, `global.ReactDOM`)
      const names = parentPath.node.declarations
      let code = ``
      for (const node of names) {
        code += `var ${node.id.name} = global.ReactDOM;\n`
      }
      parentPath.replaceWith(template.default.ast(code))
    } else if (path.node.value === 'react-dom/server') {
      const parentPath = path.findParent((path) => path.isVariableDeclaration())
      if (!parentPath) return
      const names = parentPath.node.declarations
      let code = ``
      for (const node of names) {
        code += `var ${node.id.name} = {};\n`
      }
      parentPath.replaceWith(template.default.ast(code))
    } else if (path.node.value.startsWith('@material-ui/core')) {
      const parentPath = path.findParent((path) => path.isVariableDeclaration())
      if (!parentPath) return
      const names = parentPath.node.declarations
      let code = ``
      for (const node of names) {
        const moduleNameToArray = path.node.value.split(/\//)
        const lastItem = moduleNameToArray[moduleNameToArray.length - 1]
        if (lastItem === 'styles') {
          code += `var ${node.id.name} = global.MaterialUI;\n`
          continue
        }
        code += `var ${node.id.name} = global.MaterialUI.${lastItem};\n`
      }
      parentPath.replaceWith(template.default.ast(code))
    }
  }

  // for es module import React from 'react' etc
  if (type === 'ImportDeclaration') {
    const sourceValue = _.get(path, 'node.source.value')

    if (sourceValue === 'react') {
      buildImportCode(path, 'React')
    } else if (sourceValue === 'react-dom') {
      buildImportCode(path, 'ReactDOM')
    } else if (sourceValue === 'prop-types') {
      buildImportCode(path, 'PropTypes')
    } else if (sourceValue === 'material-ui') {
      buildImportCode(path, 'MUI')
    } else if (sourceValue === 'material-ui/styles') {
      buildImportCode(path, 'MUI')
    } else if (sourceValue.startsWith('material-ui/')) {
      if (sourceValue.startsWith('material-ui/styles/colors')) {
        const specifiers = path.node.specifiers.map((node) => node)
        let code = ``
        for (const node of specifiers) {
          if (node.local.name === 'Colors') {
            code += `const ${node.local.name} = global.MUI.styles.colors;\n`
            continue
          }
          code += `const ${node.local.name} = global.MUI.styles.colors.${node.local.name};\n`
        }
        path.replaceWithMultiple(template.default.ast(code))
        return
      }
      if (sourceValue.startsWith('material-ui/styles/')) {
        const specifiers = path.node.specifiers.map((node) => node)
        let code = ``
        for (const node of specifiers) {
          code += `const ${node.local.name} = global.MUI.styles.${node.local.name};\n`
        }
        path.replaceWithMultiple(template.default.ast(code))
        return
      }
      if (sourceValue.startsWith('material-ui/svg-icons/')) {
        const specifiers = path.node.specifiers.map((node) => node)
        const moduleName = _.chain(sourceValue).split(/\//).takeRight(2).map(item => {
          return _.chain(item).split('-').map(item => {
            return _.capitalize(item)
          }).join('').value()
        }).join('').value()
        let code = ``
        for (const node of specifiers) {
          code += `const ${node.local.name} = global.MUI.svgIcons.${moduleName};\n`
        }
        path.replaceWithMultiple(template.default.ast(code))
        return
      }

      const specifiers = path.node.specifiers.map((node) => node)
      let code = ``
      for (const node of specifiers) {
        if (/\/.+\//.test(sourceValue)) {
          const lastItem = _.chain(sourceValue).split('/').last().value()
          code += `const ${node.local.name} = global.MUI.${lastItem};\n`
          continue
          // console.log(sourceValue)
        }
        code += `const ${node.local.name} = global.MUI.${node.local.name};\n`
      }
      path.replaceWithMultiple(template.default.ast(code))
    } else if (sourceValue === '@material-ui/core') {
      buildImportCode(path, 'MaterialUI')
    } else if (sourceValue === '@material-ui/styles') {
      buildImportCode(path, 'MaterialUI')
    } else if (sourceValue.startsWith('@material-ui/core/')) {
      if (sourceValue.startsWith('@material-ui/core/utils')) {
        const specifiers = path.node.specifiers.map((node) => node)
        let code = ``
        for (const node of specifiers) {
          code += `const ${node.local.name} = global.MaterialUI.${node.local.name};\n`
        }
        path.replaceWithMultiple(template.default.ast(code))
        return
      }

      if (sourceValue === '@material-ui/core/styles') {
        buildImportCode(path, 'MaterialUI')
        return
      }

      if (sourceValue === '@material-ui/core/colors') {
        buildImportCode(path, 'MaterialUI.colors')
        return
      }
      const specifiers = path.node.specifiers.map((node) => node)
      const moduleName = _.chain(sourceValue).split(/\//).last().value()
      let code = ``
      for (const node of specifiers) {
        code += `const ${node.local.name} = global.MaterialUI.${moduleName};\n`
      }
      path.replaceWithMultiple(template.default.ast(code))
    } else if (sourceValue.startsWith('@material-ui/lab')) {
      buildImportCode(path, 'MaterialUILab')
    } else if (sourceValue === 'lodash') {
      const specifiers = path.node.specifiers.map((node) => node)
      let code = ``
      for (const node of specifiers) {
        if (node.imported && node.local) {
          code += `const ${node.local.name} = global._.${node.imported.name};\n`
          continue
        }
        code += `const ${node.local.name} = global._;\n`
      }
      path.replaceWithMultiple(template.default.ast(code))
    } else if (sourceValue === '@lvfang/mantra-core') {
      buildImportCode(path, 'Mantra')
    }
  }
}

const visitor = {
  ImportDeclaration: walker,
  ImportSpecifier: walker,
  ImportDefaultSpecifier: walker,
  VariableDeclaration: walker,
  StringLiteral: walker,
}

const pre = function () {}

const post = function () {}

function buildImportCode (path, alias) {
  const specifiers = path.node.specifiers.map((node) => node)
  let code = ``
  for (const node of specifiers) {
    if (node.imported && node.local) {
      code += `const ${node.local.name} = global.${alias}.${node.imported.name};\n`
      continue
    }
    code += `const ${node.local.name} = global.${alias};\n`
  }
  path.replaceWithMultiple(template.default.ast(code))
}

module.exports = function () {
  return {
    visitor,
    pre,
    post,
  }
}
