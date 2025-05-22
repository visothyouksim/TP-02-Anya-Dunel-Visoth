const express = require('express');
const Pet = require('../models/Pet');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware pour vérifier si l'utilisateur est propriétaire de l'animal
const checkPetOwnership = async (req, res, next) => {
    try {
        const pet = await Pet.findById(req.params.id);
        if (!pet) {
            return res.status(404).json({ message: 'Animal non trouvé.' });
        }
        if (pet.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ 
                message: 'Vous n\'êtes pas autorisé à modifier cet animal.' 
            });
        }
        req.pet = pet;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};

// Créer un animal (protégé)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const petData = {
            ...req.body,
            owner: req.user._id
        };

        const pet = new Pet(petData);
        await pet.save();

        // Populer les informations du propriétaire
        await pet.populate('owner', 'username firstName lastName email phone');

        res.status(201).json({
            message: 'Animal ajouté avec succès',
            pet
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'animal:', error);
        res.status(400).json({ 
            message: 'Erreur lors de la création de l\'animal.',
            error: error.message 
        });
    }
});

// Obtenir tous les animaux (public avec recherche et filtres)
router.get('/', async (req, res) => {
    try {
        const {
            search,
            category,
            size,
            age,
            isVaccinated,
            isSterilized,
            isAdopted,
            sortBy,
            page = 1,
            limit = 10
        } = req.query;

        // Construire le filtre de recherche
        let filter = {};

        // Recherche textuelle
        if (search) {
            filter.$text = { $search: search };
        }

        // Filtres spécifiques
        if (category) filter.category = category;
        if (size) filter.size = size;
        if (age) filter.age = { $lte: parseInt(age) };
        if (isVaccinated !== undefined) filter.isVaccinated = isVaccinated === 'true';
        if (isSterilized !== undefined) filter.isSterilized = isSterilized === 'true';
        if (isAdopted !== undefined) filter.isAdopted = isAdopted === 'true';

        // Configuration de la pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Configuration du tri
        let sort = { createdAt: -1 }; // Par défaut, tri par date de création
        if (sortBy === 'name') sort = { name: 1 };
        if (sortBy === 'age') sort = { age: 1 };

        // Exécuter la requête
        const pets = await Pet.find(filter)
            .populate('owner', 'username firstName lastName phone email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        // Compter le total pour la pagination
        const total = await Pet.countDocuments(filter);

        res.json({
            pets,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            totalPets: total
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des animaux:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// Obtenir les animaux de l'utilisateur connecté
router.get('/my-pets', authenticateToken, async (req, res) => {
    try {
        const pets = await Pet.find({ owner: req.user._id })
            .populate('owner', 'username firstName lastName')
            .sort({ createdAt: -1 });

        res.json({ pets });
    } catch (error) {
        console.error('Erreur lors de la récupération de vos animaux:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// Obtenir un animal par ID
router.get('/:id', async (req, res) => {
    try {
        const pet = await Pet.findById(req.params.id)
            .populate('owner', 'username firstName lastName phone email address');

        if (!pet) {
            return res.status(404).json({ message: 'Animal non trouvé.' });
        }

        res.json({ pet });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'animal:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// Mettre à jour un animal (protégé + vérification propriétaire)
router.put('/:id', authenticateToken, checkPetOwnership, async (req, res) => {
    try {
        const updatedPet = await Pet.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('owner', 'username firstName lastName');

        res.json({
            message: 'Animal mis à jour avec succès',
            pet: updatedPet
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        res.status(400).json({ 
            message: 'Erreur lors de la mise à jour.',
            error: error.message 
        });
    }
});

// Supprimer un animal (protégé + vérification propriétaire)
router.delete('/:id', authenticateToken, checkPetOwnership, async (req, res) => {
    try {
        await Pet.findByIdAndDelete(req.params.id);
        res.json({ message: 'Animal supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// Marquer un animal comme adopté
router.patch('/:id/adopt', authenticateToken, checkPetOwnership, async (req, res) => {
    try {
        const pet = await Pet.findByIdAndUpdate(
            req.params.id,
            { isAdopted: true },
            { new: true }
        ).populate('owner', 'username firstName lastName');

        res.json({
            message: 'Animal marqué comme adopté',
            pet
        });
    } catch (error) {
        console.error('Erreur lors du marquage:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// Obtenir les statistiques
router.get('/stats/summary', async (req, res) => {
    try {
        const totalPets = await Pet.countDocuments();
        const adoptedPets = await Pet.countDocuments({ isAdopted: true });
        const availablePets = await Pet.countDocuments({ isAdopted: false });
        
        const petsByCategory = await Pet.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);

        res.json({
            totalPets,
            adoptedPets,
            availablePets,
            petsByCategory
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

module.exports = router;