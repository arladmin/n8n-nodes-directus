import { OptionsWithUri } from 'request';

import {
		IExecuteFunctions,
		IExecuteSingleFunctions,
		IHookFunctions,
		ILoadOptionsFunctions,
		IWebhookFunctions
} from 'n8n-core';

import {
		IBinaryData,
		IBinaryKeyData,
		IDataObject,
		IHttpRequestMethods,
		IHttpRequestOptions,
		INodeExecutionData,
		IPollFunctions,
		LoggerProxy as Logger
} from 'n8n-workflow';

interface IAttachment {
		url: string;
		filename: string;
		type: string;
}

export async function directusApiRequest(
		this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
		method: IHttpRequestMethods,
		path: string,
		body: any = {},
		qs: IDataObject = {},
		uri?: string,
		option: IDataObject = {},
): Promise<any> {
    
		const credentials = (await this.getCredentials('directusApi')) as {
				url: string;
				accessToken: string;
		};

		if (credentials === undefined) {
				throw new Error('No credentials got returned!');
		}

		const params = credentials;
		const url = params.url!.replace(/\/$/, '') || null;
		const accessToken = params.accessToken! || null;
		
		const options: IHttpRequestOptions = {
				headers: {
						'Content-Type': 'application/json',
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0',
				},
				method,
				qs,
				body,
				url: `${url}/${path.replace(/^\//, '')}`,
				json: true,
		};

		try {
				options.headers!['Authorization'] = accessToken ? `Bearer ${accessToken}` : "";
				//const res = await this.helpers.request!(options);
				const res = await this.helpers.httpRequestWithAuthentication.call(this, 'directusApi', options);
				return res;
		} catch (error) {
				//throw new NodeApiError(this.getNode(), error);
				throw new Error(error);
		}
}

export function validateJSON(json: string | undefined): any {
		// tslint:disable-line:no-any
		let result;
		try {
				result = JSON.parse(json!);
		} catch (exception) {
				result = undefined;
		}
		return result;
}

export async function directusApiAssetRequest(
		this: IExecuteFunctions | IExecuteSingleFunctions,
		method: IHttpRequestMethods,
		path: string,
		ID: string,
		dataPropertyName: string,
		qs: IDataObject = {},
): Promise<any> {
		// tslint:disable-line:no-any

		const credentials = (await this.getCredentials('directusApi')) as {
				url: string;
				accessToken: string;
		};

		if (credentials === undefined) {
				throw new Error('No credentials got returned!');
		}

		const params = credentials;
		const url = params.url!.replace(/\/$/, '') || null;
		const accessToken = params.accessToken! || null;


		const optionsFile: IHttpRequestOptions = {
				headers: {
						'Content-Type': 'application/json',
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0',
						Authorization: `Bearer ${accessToken}`,
				},
				method,
				qs,
				url: `${url}/files/${ID}`,
				json: true,
		};

		const optionsAsset: IHttpRequestOptions = {
				headers: {
						'Content-Type': 'application/json',
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0',
						Authorization: `Bearer ${accessToken}`,
				},
				method,
				qs,
				url: `${url}/assets/${ID}`,
				json: true,
				encoding: "arraybuffer"
		};

		try {
				//const resFile = await this.helpers.request!(optionsFile);                
				const resFile = await this.helpers.httpRequestWithAuthentication.call(this, 'directusApi', optionsFile);
				const file = resFile.data;

				//const res: any = await this.helpers.request!(optionsAsset);                
				const res = await this.helpers.httpRequestWithAuthentication.call(this, 'directusApi', optionsAsset);
				const binaryData = Buffer.from(res);

				const binary: IBinaryKeyData = {};
				binary![dataPropertyName] = await this.helpers.prepareBinaryData(
						binaryData,
						file.filename_download,
						file.type,
				);

				const json = { file };
				const result: INodeExecutionData = {
						json,
						binary,
				};
				return result;
		} catch (error) {
				throw new Error(error);
		}
}

/// To: 1.) Create a new File (including file content), 2.) Update a file (file content or file object)
export async function directusApiFileRequest(
		this: IExecuteFunctions | IExecuteSingleFunctions | IWebhookFunctions,
		method: IHttpRequestMethods,
		path: string,
		formData: any = {},
		body: any = {},
		qs: IDataObject = {},
		uri?: string,
		option: IDataObject = {},
): Promise<any> {
		// tslint:disable-line:no-any        

		const credentials = (await this.getCredentials('directusApi')) as {
				url: string;
				accessToken: string;
		};

		if (credentials === undefined) {
				throw new Error('No credentials got returned!');
		}

		const params = credentials;
		const url = params.url!.replace(/\/$/, '') || null;
		const accessToken = params.accessToken! || null;

		const optionsFormData: IHttpRequestOptions = {
				headers: {
						'Content-Type': 'multipart/form-data',
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0',
						Authorization: `Bearer ${accessToken}`,
				},
				method,
				qs,
				body: formData,
				url: `${url}/${path}`,
		};
		const responseFile = {};

		try {
				if (method == 'POST') {
						// 1. Create a file with content

						const response = await this.helpers.request!(optionsFormData);
                        //const response = await this.helpers.httpRequestWithAuthentication.call(this, 'directusApi', optionsFormData);
						const file = JSON.parse(response).data;


						// 2. Update the file object with fileObject properties
						const res = await directusApiRequest.call(
								this,
								'PATCH',
								`files/${file.id}`,
								body,
						);
						Object.assign(responseFile, res);
				}
				if (method == 'PATCH') {
						// 1. Check if formdata and/or body are provided
						const isForm = ((Object.keys(formData).length > 0) as boolean) ?? false;
						const isBody = ((Object.keys(body).length > 0) as boolean) ?? false;

						// 2. Sequentially, update them both
						if (isForm) {
								const options: IHttpRequestOptions = {
										headers: {
												'Content-Type': 'multipart/form-data',
                                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0',
												Authorization: `Bearer ${accessToken}`,
										},
										method,
										qs,
										body: formData,
										url: `${url}/files`,
								};

								const response = await this.helpers.request!(optionsFormData);
                                //const response = await this.helpers.httpRequestWithAuthentication.call(this, 'directusApi', optionsFormData);
								const file = JSON.parse(response).data;
								Object.assign(responseFile, file);
						}
						if (isBody) {
								const res = await directusApiRequest.call(
										this,
										'PATCH',
										'files',
										body,
								);
								Object.assign(responseFile, res);
						}
				}
				// 3. Return the final result
				return responseFile;

		} catch (error) {
				//throw new NodeApiError(this.getNode(), error);
				throw new Error(error);
		}
}
