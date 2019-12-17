/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import _ = require('lodash')
import { SchemaClient } from '../../shared/clients/schemaClient'
import { SchemaCodeGenUtils, IdentifierFormatter } from '../../eventSchemas/models/schemaCodeGenUtils'

const X_AMAZON_EVENT_SOURCE = 'x-amazon-events-source'
const X_AMAZON_EVENT_DETAIL_TYPE = 'x-amazon-events-detail-type'

const COMPONENTS = 'components'
const SCHEMAS = 'schemas'
const COMPONENTS_SCHEMAS_PATH = '#/components/schemas/'
const AWS_EVENT = 'AWSEvent'
const PROPERTIES = 'properties'
const DETAIL = 'detail'
const REF = '$ref'

const DEFAULT_EVENT_SOURCE = 'INSERT-YOUR-EVENT-SOURCE'
const DEFAULT_EVENT_DETAIL_TYPE = 'INSERT-YOUR-DETAIL-TYPE'

export interface SchemaTemplateParameters {
    //SchemaSummary : string, // bu hele tam figure out elememishem,
    SchemaVersion: string
    templateExtraContent: SchemaTemplateExtraContext
}

// This matches the extra_content parameters to Schema-based templates in both key and value names in cookiecutter.json in the templates used by
// SamEventBridgeStarterAppMaven and SamEventBridgeStarterAppGradle
export interface SchemaTemplateExtraContext {
    AWS_Schema_registry: string
    AWS_Schema_name: string
    AWS_Schema_root: string
    AWS_Schema_source: string
    AWS_Schema_detail_type: string
    user_agent: string
}

export async function buildSchemaTemplateParameters(schemaName: string, registryName: string, client: SchemaClient) {
    const response = await client.describeSchema(registryName, schemaName)
    const schemaNode = JSON.parse(response.Content!)
    const latestSchemaVersion = response.SchemaVersion

    const awsEventNode = getAwsEventNode(response.Content!) as string

    // Derive source from custom OpenAPI metadata provided by Schemas service
    const source = _.get(awsEventNode, X_AMAZON_EVENT_SOURCE, DEFAULT_EVENT_SOURCE)

    // Derive detail type from custom OpenAPI metadata provided by Schemas service
    const detailType = _.get(awsEventNode, X_AMAZON_EVENT_DETAIL_TYPE, DEFAULT_EVENT_DETAIL_TYPE)

    // Generate schema root/package from the scheme name
    // In the near future, this will be returned as part of a Schemas Service API call
    const schemaPackageHierarchy = buildSchemaPackageHierarchy(schemaName)

    // Derive root schema event name from OpenAPI metadata, or if ambiguous, use the last post-character section of a schema name
    const rootSchemaEventName = buildRootSchemaEventName(schemaNode, awsEventNode) || getCoreFileName(schemaName) // commented this part only, replace edir haa @ isarelerin odu ?: schemaSummary.title()  BUNA GORE
    //UNDEFINED ALIRAM MEN SHEYDE CUSTOMUPLOADED SCHEMADA

    const templateExtraContent: SchemaTemplateExtraContext = {
        AWS_Schema_registry: registryName,
        AWS_Schema_name: rootSchemaEventName!,
        AWS_Schema_root: schemaPackageHierarchy, // schema package hierarchy
        AWS_Schema_source: source as string,
        AWS_Schema_detail_type: detailType as string,
        // Need to provide user agent to SAM CLI so that it will enable appTemplate-based
        user_agent: 'AWSToolkit'
    }

    const schemaTemplateParameters: SchemaTemplateParameters = {
        SchemaVersion: latestSchemaVersion!,
        templateExtraContent: templateExtraContent
    }

    return schemaTemplateParameters
}

function buildSchemaPackageHierarchy(schemaName: string) {
    const codeGenUtilsObject = new SchemaCodeGenUtils()

    return codeGenUtilsObject.buildSchemaPackageName(schemaName)
}

function buildRootSchemaEventName(schemaNode: any, awsEventNode: any) {
    const identifierFormatter = new IdentifierFormatter()
    const refValue = _.get(awsEventNode, PROPERTIES.concat('.', DETAIL, '.', REF))

    if (_.isString(refValue) && refValue.includes(COMPONENTS_SCHEMAS_PATH)) {
        const awsEventDetailRef = refValue.split(COMPONENTS_SCHEMAS_PATH).pop()

        // check ele gore bu undefined deyil
        return identifierFormatter.toValidIdentifier(awsEventDetailRef!)
    }

    const schemaRoots = _.keysIn(_.get(schemaNode, COMPONENTS.concat('.', SCHEMAS)))
    if (schemaRoots.length >= 1) {
        return identifierFormatter.toValidIdentifier(schemaRoots[0])
    }

    return undefined
}

function getAwsEventNode(schemaNode: string) {
    const schemasNodeJson = JSON.parse(schemaNode)

    // Standard OpenAPI specification
    return _.get(schemasNodeJson, COMPONENTS.concat('.', SCHEMAS, '.', AWS_EVENT))
}

//modify method in download code bindings class -
function getCoreFileName(schemaName: string) {
    const parsedName = schemaName.split('@')

    return parsedName[parsedName.length - 1]
}
