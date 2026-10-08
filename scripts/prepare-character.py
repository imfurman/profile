"""Pack selected CC0 Quaternius meshes for the portfolio. No third-party Python dependencies.

Usage: python3 scripts/prepare-character.py /path/to/extracted/packs
Extract Universal Base Characters (Standard) there and add Suit.gltf from Ultimate Modular Men.
See docs/interactive-portrait.md for the source links.
"""
from pathlib import Path
import base64
import copy
import json
import struct
import sys

source = Path(sys.argv[1])
destination = Path(__file__).resolve().parents[1] / 'themes/minimal/static/models/portrait'
destination.mkdir(parents=True, exist_ok=True)


def pack(path, filename, head_only=False, eyes=False, suit=False):
    data = json.loads(path.read_text())
    if suit:
        for node in data['nodes']:
            if node.get('name') in ('Pistol', 'Suit_Head'):
                node.pop('mesh', None)
                node.pop('skin', None)
        used = sorted({n['mesh'] for n in data['nodes'] if 'mesh' in n})
        remap = {old: new for new, old in enumerate(used)}
        data['meshes'] = [data['meshes'][i] for i in used]
        for node in data['nodes']:
            if 'mesh' in node: node['mesh'] = remap[node['mesh']]
    uri = data['buffers'][0]['uri']
    original = base64.b64decode(uri.split(',', 1)[1]) if uri.startswith('data:') else (path.parent / uri).read_bytes()
    binary = bytearray()
    old_views, old_accessors = data['bufferViews'], data['accessors']
    views, accessors, mapping = [], [], {}

    def append(raw, target=None):
        binary.extend(b'\0' * (-len(binary) % 4))
        view = {'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(raw)}
        if target: view['target'] = target
        views.append(view)
        binary.extend(raw)
        return len(views) - 1

    def accessor(index):
        if index in mapping: return mapping[index]
        a = copy.deepcopy(old_accessors[index])
        v = old_views[a['bufferView']]
        start = v.get('byteOffset', 0)
        a['bufferView'] = append(original[start:start + v['byteLength']], v.get('target'))
        if 'byteStride' in v: views[-1]['byteStride'] = v['byteStride']
        mapping[index] = len(accessors)
        accessors.append(a)
        return mapping[index]

    def values(index):
        a = old_accessors[index]
        v = old_views[a['bufferView']]
        components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
        fmt = '<' + {5121: 'B', 5123: 'H', 5125: 'I', 5126: 'f'}[a['componentType']] * components
        stride = v.get('byteStride', struct.calcsize(fmt))
        start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return [struct.unpack_from(fmt, original, start + i * stride) for i in range(a['count'])]

    def replace_indices(primitive, selected):
        raw = struct.pack('<' + 'H' * len(selected), *selected)
        primitive['indices'] = len(accessors)
        accessors.append({'bufferView': append(raw, 34963), 'componentType': 5123,
                          'count': len(selected), 'type': 'SCALAR',
                          'min': [min(selected)], 'max': [max(selected)]})

    for mesh in data['meshes']:
        for primitive in mesh['primitives']:
            if head_only and mesh['name'].startswith('Sphere'):
                positions = values(primitive['attributes']['POSITION'])
                indices = [v[0] for v in values(primitive['indices'])]
                # The cut is hidden inside the shirt collar; retain the authored head and neck.
                selected = []
                for i in range(0, len(indices), 3):
                    triangle = indices[i:i + 3]
                    if all((positions[j][1] > 1.62 and abs(positions[j][0]) < .16)
                           or (positions[j][1] > 1.48 and abs(positions[j][0]) < .055)
                           for j in triangle):
                        selected.extend(triangle)
                used = sorted(set(selected))
                remap = {old: new for new, old in enumerate(used)}
                replace_indices(primitive, [remap[i] for i in selected])
                attributes = {}
                for name, index in primitive['attributes'].items():
                    a = copy.deepcopy(old_accessors[index])
                    rows = values(index)
                    rows = [rows[i] for i in used]
                    fmt = '<' + {5121: 'B', 5123: 'H', 5125: 'I', 5126: 'f'}[a['componentType']] * len(rows[0])
                    a['bufferView'] = append(b''.join(struct.pack(fmt, *row) for row in rows), 34962)
                    a.pop('byteOffset', None)
                    a['count'] = len(rows)
                    if 'min' in a: a['min'] = [min(row[k] for row in rows) for k in range(len(rows[0]))]
                    if 'max' in a: a['max'] = [max(row[k] for row in rows) for k in range(len(rows[0]))]
                    attributes[name] = len(accessors)
                    accessors.append(a)
                primitive['attributes'] = attributes
                continue
            else:
                primitive['indices'] = accessor(primitive['indices'])
            primitive['attributes'] = {k: accessor(v) for k, v in primitive['attributes'].items()}
    if suit:
        data['animations'] = [a for a in data['animations'] if a['name'] == 'Idle_Neutral']
        for animation in data['animations']:
            for sampler in animation['samplers']:
                sampler['input'] = accessor(sampler['input'])
                sampler['output'] = accessor(sampler['output'])
    for skin in data.get('skins', []):
        skin['inverseBindMatrices'] = accessor(skin['inverseBindMatrices'])
    for material in data.get('materials', []):
        material.pop('normalTexture', None)
        material.pop('occlusionTexture', None)
        material['doubleSided'] = False
        material['pbrMetallicRoughness'] = {'baseColorFactor': [.5, .5, .5, 1],
                                          'metallicFactor': 0, 'roughnessFactor': .85}
        if eyes and material['name'] == 'MI_Eyes':
            material['pbrMetallicRoughness'] = {'baseColorTexture': {'index': 0},
                                              'metallicFactor': 0, 'roughnessFactor': .5}
    if eyes:
        image_path = path.parent / 'T_Eye_Brown.png'
        data['images'] = [{'bufferView': append(image_path.read_bytes()), 'mimeType': 'image/png'}]
        data['textures'] = [{'source': 0}]
    else:
        data.pop('images', None)
        data.pop('textures', None)
    data.pop('samplers', None)
    if not suit: data.pop('animations', None)
    data['accessors'], data['bufferViews'] = accessors, views
    data['buffers'] = [{'byteLength': len(binary)}]
    data['asset']['copyright'] = 'Quaternius — CC0 1.0; selected and repackaged for imfurman'
    js = json.dumps(data, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    binary.extend(b'\0' * (-len(binary) % 4))
    result = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binary))
    result += struct.pack('<II', len(js), 0x4E4F534A) + js
    result += struct.pack('<II', len(binary), 0x004E4942) + binary
    (destination / filename).write_bytes(result)
    print(filename, len(result), 'bytes')


pack(next(source.glob('**/Godot - UE/Superhero_Male_FullBody.gltf')), 'head.glb', head_only=True, eyes=True)
pack(source / 'Suit.gltf', 'outfit.glb', suit=True)
for name, filename in [('Hair_SimpleParted', 'hair.glb'), ('Hair_Beard', 'beard.glb')]:
    pack(next(source.glob(f'**/Origin at 0/glTF*/{name}.gltf')), filename)
for pack_name, filename in [('Universal Base Characters[Standard]', 'BASE-LICENSE.txt')]:
    (destination / filename).write_text((source / pack_name / 'License_Standard.txt').read_text())

(destination / 'OUTFIT-LICENSE.txt').write_text("""Ultimate Modular Men Pack — Suit character
Author: Quaternius
License: Creative Commons CC0 1.0 Universal
https://creativecommons.org/publicdomain/zero/1.0/
Source: https://quaternius.com/packs/ultimatemodularcharacters.html
The author's source page labels this pack CC0 and permits personal and commercial use.
Adaptation: head and prop removed; neutral animation retained; repackaged as a local GLB.
This provenance notice was added for the portfolio; it is not the author's original license file.
""")
