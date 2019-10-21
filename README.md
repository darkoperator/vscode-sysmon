# Sysmon

This Visual Studio Code extension is for heping in the writting of Sysmon XML configuration files.

## Features

This extensions offers a series of snippets for helping in building a Microsofty Sysinternals Sysmon XML configuration. The extension is based on the 4.22 version of the Sysinternals Sysmon schema. It also provide automatic closing of element tags for the filter fields.

## Usage

Change the language to Sysmon on a existing XML file or use the extension ".smc".

<img src=https://raw.githubusercontent.com/darkoperator/vscode-sysmon/master/images/setlang.gif>

### Snippets

General snippets for the building of the initial structure of the configuration file.

| Name     | Description     |
|----------|-----------------|
| comment | Sysmon Comment |
| sysmon_config | Template Sysmon Config |
| rulegroup | Sysmon RuleGroup |
| rule | Sysmon Rule |
| condition | Filter condition operator used |

Snippets for each of the individual filters available in the schema with the exception of the run time unique ones that one would not filter on like ProcessID, UTC Time, Sysmon system unique GUIDs and others. 

| Name     | Description     |
|----------|-----------------|
| !ProcessCreate | Sysmon EventType ProcessCreate |
| !FileCreateTime | Sysmon EventType FileCreateTime |
| !NetworkConnect | Sysmon EventType NetworkConnect |
| !ProcessTerminate | Sysmon EventType ProcessTerminate |
| !DriverLoad | Sysmon EventType DriverLoad |
| !ImageLoad | Sysmon EventType ImageLoad |
| !CreateRemoteThread | Sysmon EventType CreateRemoteThread |
| !RawAccessRead | Sysmon EventType RawAccessRead |
| !ProcessAccess | Sysmon EventType ProcessAccess |
| !FileCreate | Sysmon EventType FileCreate |
| !RegistryEvent | Sysmon EventType RegistryEvent |
| !FileCreateStreamHash | Sysmon EventType FileCreateStreamHash |
| !PipeEvent | Sysmon EventType PipeEvent |
| !WmiEvent | Sysmon EventType WmiEvent |
| !DnsQuery | Sysmon EventType DnsQuery |
| !CallTrace | Sysmon event field CallTrace filter |
| !CommandLine | Sysmon event field CommandLine filter |
| !Company | Sysmon event field Company filter |
| !Configuration | Sysmon event field Configuration filter |
| !ConfigurationFileHash | Sysmon event field ConfigurationFileHash filter |
| !Consumer | Sysmon event field Consumer filter |
| !CurrentDirectory | Sysmon event field CurrentDirectory filter |
| !Description | Sysmon event field Description filter |
| !Destination | Sysmon event field Destination filter |
| !DestinationHostname | Sysmon event field DestinationHostname filter |
| !DestinationIp | Sysmon event field DestinationIp filter |
| !DestinationIsIpv6 | Sysmon event field DestinationIsIpv6 filter |
| !DestinationPort | Sysmon event field DestinationPort filter |
| !DestinationPortName | Sysmon event field DestinationPortName filter |
| !Details | Sysmon event field Details filter |
| !Device | Sysmon event field Device filter |
| !EventNamespace | Sysmon event field EventNamespace filter |
| !EventType | Sysmon event field EventType filter |
| !FileVersion | Sysmon event field FileVersion filter |
| !Filter | Sysmon event field Filter filter |
| !GrantedAccess | Sysmon event field GrantedAccess filter |
| !Hash | Sysmon event field Hash filter |
| !Hashes | Sysmon event field Hashes filter |
| !ID | Sysmon event field ID filter |
| !Image | Sysmon event field Image filter |
| !ImageLoaded | Sysmon event field ImageLoaded filter |
| !Initiated | Sysmon event field Initiated filter |
| !IntegrityLevel | Sysmon event field IntegrityLevel filter |
| !Name | Sysmon event field Name filter |
| !NewName | Sysmon event field NewName filter |
| !Operation | Sysmon event field Operation filter |
| !OriginalFileName | Sysmon event field OriginalFileName filter |
| !ParentCommandLine | Sysmon event field ParentCommandLine filter |
| !ParentImage | Sysmon event field ParentImage filter |
| !PipeName | Sysmon event field PipeName filter |
| !PreviousCreationUtcTime | Sysmon event field PreviousCreationUtcTime filter |
| !Product | Sysmon event field Product filter |
| !Protocol | Sysmon event field Protocol filter |
| !Query | Sysmon event field Query filter |
| !QueryName | Sysmon event field QueryName filter |
| !QueryResults | Sysmon event field QueryResults filter |
| !QueryStatus | Sysmon event field QueryStatus filter |
| !SchemaVersion | Sysmon event field SchemaVersion filter |
| !Signature | Sysmon event field Signature filter |
| !SignatureStatus | Sysmon event field SignatureStatus filter |
| !Signed | Sysmon event field Signed filter |
| !SourceHostname | Sysmon event field SourceHostname filter |
| !SourceImage | Sysmon event field SourceImage filter |
| !SourceIp | Sysmon event field SourceIp filter |
| !SourceIsIpv6 | Sysmon event field SourceIsIpv6 filter |
| !SourcePort | Sysmon event field SourcePort filter |
| !SourcePortName | Sysmon event field SourcePortName filter |
| !SourceThreadId | Sysmon event field SourceThreadId filter |
| !StartAddress | Sysmon event field StartAddress filter |
| !StartFunction | Sysmon event field StartFunction filter |
| !StartModule | Sysmon event field StartModule filter |
| !State | Sysmon event field State filter |
| !TargetFilename | Sysmon event field TargetFilename filter |
| !TargetImage | Sysmon event field TargetImage filter |
| !TargetObject | Sysmon event field TargetObject filter |
| !Type | Sysmon event field Type filter |
| !User | Sysmon event field User filter |
| !Version | Sysmon event field Version filter |

When working with Rule elements in the config where he order of the field play an important role these snippets will put all fileds one would filter on in the order as they appear in the schema. Each with positions set for the name and the condition with a option set to make it easier to select.

| Name     | Description     |
|----------|-----------------|
| !sysmon_create_process_filter_set | Sysmon EventType SYSMON_CREATE_PROCESS filter set. |
| !sysmon_file_time_filter_set | Sysmon EventType SYSMON_FILE_TIME filter set. |
| !sysmon_network_connect_filter_set | Sysmon EventType SYSMON_NETWORK_CONNECT filter set. |
| !sysmon_process_terminate_filter_set | Sysmon EventType SYSMON_PROCESS_TERMINATE filter set. |
| !sysmon_driver_load_filter_set | Sysmon EventType SYSMON_DRIVER_LOAD filter set. |
| !sysmon_image_load_filter_set | Sysmon EventType SYSMON_IMAGE_LOAD filter set. |
| !sysmon_create_remote_thread_filter_set | Sysmon EventType SYSMON_CREATE_REMOTE_THREAD filter set. |
| !sysmon_rawaccess_read_filter_set | Sysmon EventType SYSMON_RAWACCESS_READ filter set. |
| !sysmon_access_process_filter_set | Sysmon EventType SYSMON_ACCESS_PROCESS filter set. |
| !sysmon_file_create_filter_set | Sysmon EventType SYSMON_FILE_CREATE filter set. |
| !sysmon_reg_key_filter_set | Sysmon EventType SYSMON_REG_KEY filter set. |
| !sysmon_reg_setvalue_filter_set | Sysmon EventType SYSMON_REG_SETVALUE filter set. |
| !sysmon_reg_name_filter_set | Sysmon EventType SYSMON_REG_NAME filter set. |
| !sysmon_file_create_stream_hash_filter_set | Sysmon EventType SYSMON_FILE_CREATE_STREAM_HASH filter set. |
| !sysmon_create_namedpipe_filter_set | Sysmon EventType SYSMON_CREATE_NAMEDPIPE filter set. |
| !sysmon_connect_namedpipe_filter_set | Sysmon EventType SYSMON_CONNECT_NAMEDPIPE filter set. |
| !sysmon_wmi_filter_filter_set | Sysmon EventType SYSMON_WMI_FILTER filter set. |
| !sysmon_wmi_consumer_filter_set | Sysmon EventType SYSMON_WMI_CONSUMER filter set. |
| !sysmon_wmi_binding_filter_set | Sysmon EventType SYSMON_WMI_BINDING filter set. |
| !sysmon_dns_query_filter_set | Sysmon EventType SYSMON_DNS_QUERY filter set. |

## Release Notes

### 1.0.0

Initial release.

## Questions, issues, feature requests, and contributions

* If you come across a problem with the extension, please [file an issue](https://github.com/darkoperator/vscode-sysmon)
* Contributions are always welcome!
* Any and all feedback is appreciated and welcome!
  * If someone has already [filed an issue](https://github.com/darkoperator/vscode-sysmon) that encompasses your feedback, please leave a 👍/👎 reaction on the issue
  * Otherwise please file a new issue
